// 화면에서 호출하는 저장 동작. 도메인 규칙을 적용한 변경 묶음(Batch)을 만들어 저장소에 보낸다.
// 서버도 시간 중복 규칙을 다시 검사한다(이중 검증).
import type { Batch, Collection, RecordDoc } from '../domain/collections'
import { findSessionConflicts, partIndex, recomputeAutoComplete, setTodoDoneManually } from '../domain/logic'
import type { DateStr, Due } from '../domain/time'
import type { ActiveTimer, ActivityRef, AppData, CalendarEvent, ExamTag, Priority, StudySession, TimeBlock, Todo, Workbook } from '../domain/types'
import { deviceId, deviceName } from '../platform/device'
import { StoreError, type Store } from './store'

const uuid = () => crypto.randomUUID()
const put = <T extends { id: string }>(c: Collection, data: T) => ({ c, data: data as unknown as RecordDoc })

export interface TodoInput {
  title: string
  subjectId?: string
  tags: ExamTag[]
  priority: Priority
  due?: Due
  subtasks: { id?: string; title: string; dueDate?: DateStr }[]
}

export interface SessionInput {
  subjectId: string
  tags: ExamTag[]
  start: string
  end: string
  planBlockId?: string
}

export type Actions = ReturnType<typeof createActions>

export function createActions(store: Store, get: () => AppData, refresh: () => Promise<void>) {
  const run = async (b: Batch) => {
    await store.batch(b)
    await refresh()
  }

  /** Part 완료 상태가 바뀐 뒤 그 Part에 연결된 할 일들의 자동 완료를 다시 계산 */
  function partChanges(workbooks: Workbook[], ids: Set<string>, done: boolean, todosOverride: Todo[] = get().todos) {
    const changedBooks = workbooks
      .filter((w) => w.units.some((u) => u.parts.some((p) => ids.has(p.id) && p.done !== done)))
      .map((w) => ({ ...w, units: w.units.map((u) => ({ ...u, parts: u.parts.map((p) => (ids.has(p.id) ? { ...p, done } : p)) })) }))
    const nextBooks = workbooks.map((w) => changedBooks.find((x) => x.id === w.id) ?? w)
    const idx = partIndex(nextBooks)
    const isDone = (id: string) => idx.get(id)?.done ?? false
    const changedTodos = todosOverride
      .filter((t) => t.partIds.some((p) => ids.has(p)))
      .map((t) => recomputeAutoComplete(t, isDone))
    return { changedBooks, changedTodos, isDone }
  }

  function finalizeSegment(timer: ActiveTimer, nowIso: string): StudySession | null {
    const breaks = [...(timer.breaks ?? []), ...(timer.breakStart ? [{ start: timer.breakStart, end: nowIso }] : [])]
    if (Date.parse(nowIso) - Date.parse(timer.segmentStart) < 60_000) return null // 1분 미만은 기록하지 않음
    return {
      id: uuid(),
      subjectId: timer.subjectId,
      tags: timer.tags,
      start: timer.segmentStart,
      end: nowIso,
      breaks,
      planBlockId: timer.planBlockId,
      activity: timer.activity,
      source: 'timer',
    }
  }

  /** 확정 기록과 겹치면 충돌 후보로 보존 (Q82) */
  function placeSession(s: StudySession) {
    return findSessionConflicts(get().sessions, s).length ? put('timerConflicts', s) : put('sessions', s)
  }

  return {
    // ───── 과목 ─────
    addSubject(name: string, parentId?: string) {
      const d = get()
      const parent = d.subjects.find((s) => s.id === parentId)
      const color = parent ? parent.color : d.subjects.filter((s) => !s.parentId).length % 6
      return run({ put: [put('subjects', { id: uuid(), name: name.trim(), parentId: parent?.id, color })] })
    },
    /** 이름만 바꾸고 ID는 유지 → 과거 기록에도 새 이름 표시 (Q125) */
    renameSubject(id: string, name: string) {
      const s = get().subjects.find((x) => x.id === id)
      if (!s) return Promise.resolve()
      return run({ put: [put('subjects', { ...s, name: name.trim() })] })
    },
    /** 과목만 휴지통으로, 과거 기록의 과목 ID는 보존 (Q126) */
    removeSubject(id: string) {
      if (get().subjects.some((s) => s.parentId === id)) throw new StoreError(409, '세부 과목을 먼저 삭제하세요.')
      return run({ remove: [{ c: 'subjects', id }] })
    },

    // ───── 할 일 ─────
    saveTodo(input: TodoInput, id?: string) {
      const prev = id ? get().todos.find((t) => t.id === id) : undefined
      const subtasks = input.subtasks
        .filter((s) => s.title.trim())
        .map((s) => {
          const old = prev?.subtasks.find((x) => x.id === s.id)
          return { id: s.id ?? uuid(), title: s.title.trim(), dueDate: s.dueDate || undefined, done: old?.done ?? false }
        })
      let todo: Todo = {
        id: prev?.id ?? uuid(),
        title: input.title.trim(),
        subjectId: input.subjectId || undefined,
        tags: input.tags,
        priority: input.priority,
        due: input.due,
        done: prev?.done ?? false,
        autoCompleted: prev?.autoCompleted,
        subtasks,
        partIds: prev?.partIds ?? [],
        projectStepId: prev?.projectStepId,
      }
      const idx = partIndex(get().workbooks)
      todo = recomputeAutoComplete(todo, (p) => idx.get(p)?.done ?? false)
      return run({ put: [put('todos', todo)] })
    },
    /** 상위 직접 체크/취소 (Q62, Q67). includeParts=true면 남은 연결 Part도 완료 (Q33) */
    setTodoDone(id: string, done: boolean, includeParts = false) {
      const d = get()
      const t = d.todos.find((x) => x.id === id)
      if (!t) return Promise.resolve()
      const next = setTodoDoneManually(t, done)
      if (!includeParts || !done) return run({ put: [put('todos', next)] })
      const others = d.todos.map((x) => (x.id === id ? next : x))
      const { changedBooks, changedTodos } = partChanges(d.workbooks, new Set(t.partIds), true, others)
      const todos = [next, ...changedTodos.filter((x) => x.id !== id)]
      return run({ put: [...changedBooks.map((w) => put('workbooks', w)), ...todos.map((x) => put('todos', x))] })
    },
    toggleSubtask(todoId: string, subId: string) {
      const d = get()
      const t = d.todos.find((x) => x.id === todoId)
      if (!t) return Promise.resolve()
      const idx = partIndex(d.workbooks)
      const next = recomputeAutoComplete(
        { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)) },
        (p) => idx.get(p)?.done ?? false,
      )
      return run({ put: [put('todos', next)] })
    },
    /** 상위 삭제 시 하위 항목도 함께 휴지통 (Q121). 연결 Part는 삭제하지 않음 */
    removeTodo(id: string) {
      return run({ remove: [{ c: 'todos', id }] })
    },

    // ───── 문제집 ─────
    createWorkbook(input: { title: string; subjectId: string; units: { title: string; count: number }[] }) {
      const wb: Workbook = {
        id: uuid(),
        title: input.title.trim(),
        subjectId: input.subjectId,
        units: input.units.map((u) => ({
          id: uuid(),
          title: u.title,
          parts: Array.from({ length: u.count }, (_, i) => ({ id: uuid(), label: `Part ${i + 1}`, done: false })),
        })),
      }
      return run({ put: [put('workbooks', wb)] })
    },
    /** 중단원 추가. 완료된 문제집도 새 미완료 Part가 생기면 진행률 재계산 (Q101) */
    addUnit(workbookId: string, title: string, count: number) {
      const w = get().workbooks.find((x) => x.id === workbookId)
      if (!w) return Promise.resolve()
      const unit = { id: uuid(), title, parts: Array.from({ length: count }, (_, i) => ({ id: uuid(), label: `Part ${i + 1}`, done: false })) }
      return run({ put: [put('workbooks', { ...w, units: [...w.units, unit] })] })
    },
    /** 여러 Part 일괄 완료/취소 (Q93) + 연결된 할 일 자동 완료 재계산 (Q32, Q66) */
    setPartsDone(partIds: string[], done: boolean) {
      const { changedBooks, changedTodos } = partChanges(get().workbooks, new Set(partIds), done)
      if (!changedBooks.length) return Promise.resolve()
      return run({ put: [...changedBooks.map((w) => put('workbooks', w)), ...changedTodos.map((t) => put('todos', t))] })
    },
    /** 외부 연결(할 일·계획·기록)은 참조 ID 그대로 보존 (Q81) */
    removeWorkbook(id: string) {
      return run({ remove: [{ c: 'workbooks', id }] })
    },

    // ───── 학습 계획·일정 ─────
    /** 학습 계획끼리 겹치면 저장 차단 (Q69) — 서버에서도 검사 */
    saveBlock(block: Omit<TimeBlock, 'id'> & { id?: string }) {
      return run({ put: [put('blocks', { ...block, id: block.id ?? uuid() })] })
    },
    /** 계획만 휴지통, 연결된 실제 기록은 유지 (Q141) */
    removeBlock(id: string) {
      return run({ remove: [{ c: 'blocks', id }] })
    },
    addEvent(input: { title: string; start: string; end: string; weekdays: number[] }) {
      const ev: CalendarEvent = {
        id: uuid(),
        title: input.title.trim(),
        kind: 'personal',
        start: input.start,
        end: input.end,
        recurrence: input.weekdays.length ? { weekdays: input.weekdays } : undefined,
      }
      return run({ put: [put('events', ev)] })
    },
    /** 반복 일정 삭제는 선택한 한 회차만 (Q142) */
    removeEventOccurrence(id: string, day: DateStr) {
      const ev = get().events.find((e) => e.id === id)
      if (!ev) return Promise.resolve()
      if (!ev.recurrence) return run({ remove: [{ c: 'events', id }] })
      return run({ put: [put('events', { ...ev, exceptDates: [...(ev.exceptDates ?? []), day] })] })
    },

    // ───── 타이머·공부 기록 ─────
    /** 계정당 실행 중 타이머 1개 (Q71) */
    startTimer(input: { subjectId: string; tags: ExamTag[]; planBlockId?: string; activity?: ActivityRef }) {
      if (get().activeTimer) throw new StoreError(409, '이미 실행 중인 타이머가 있습니다.')
      const timer: ActiveTimer = { ...input, segmentStart: new Date().toISOString(), breaks: [], ownerDeviceId: deviceId(), ownerDeviceName: deviceName() }
      return run({ kv: { activeTimer: timer } })
    },
    toggleBreak() {
      const t = get().activeTimer
      if (!t) return Promise.resolve()
      const now = new Date().toISOString()
      const next: ActiveTimer = t.breakStart
        ? { ...t, breaks: [...(t.breaks ?? []), { start: t.breakStart, end: now }], breakStart: undefined }
        : { ...t, breakStart: now }
      return run({ kv: { activeTimer: next } })
    },
    /** 전환 확정 시점에 이전 구간 마감, 새 과목은 계획 블록과 분리 (Q47, Q76) */
    switchSubject(input: { subjectId: string; tags: ExamTag[] }) {
      const t = get().activeTimer
      if (!t) return Promise.resolve()
      const now = new Date().toISOString()
      const session = finalizeSegment(t, now)
      const next: ActiveTimer = { subjectId: input.subjectId, tags: input.tags, segmentStart: now, breaks: [], ownerDeviceId: t.ownerDeviceId, ownerDeviceName: t.ownerDeviceName }
      return run({ put: session ? [placeSession(session)] : [], kv: { activeTimer: next } })
    },
    /** 종료: 현재 구간을 기록으로 확정. 기존 기록과 겹치면 충돌 후보로 보존 */
    async stopTimer(): Promise<{ conflict: boolean; saved: boolean }> {
      const t = get().activeTimer
      if (!t) return { conflict: false, saved: false }
      const session = finalizeSegment(t, new Date().toISOString())
      const placed = session ? placeSession(session) : null
      await run({ put: placed ? [placed] : [], kv: { activeTimer: null } })
      return { conflict: placed?.c === 'timerConflicts', saved: !!placed }
    },
    /** 다른 기기에서 실행 중인 타이머를 이 기기로 가져오기 (Q71, Q148) */
    transferTimer() {
      const t = get().activeTimer
      if (!t) return Promise.resolve()
      return run({ kv: { activeTimer: { ...t, ownerDeviceId: deviceId(), ownerDeviceName: deviceName() } } })
    },
    /** 수동 기록: 시작·종료 필수 (Q74), 계획 블록 선택 연결 (Q147) */
    addManualSession(input: SessionInput) {
      const s: StudySession = { id: uuid(), ...input, breaks: [], source: 'manual' }
      return run({ put: [put('sessions', s)] })
    },
    /** 충돌 해결: 수정한 시간으로 확정, 겹침이 남으면 서버가 거부 (Q138) */
    resolveConflict(candidateId: string, times: Record<string, { start: string; end: string }>) {
      const d = get()
      const cand = d.timerConflicts.find((c) => c.id === candidateId)
      if (!cand) return Promise.resolve()
      const puts = Object.entries(times).map(([id, tm]) => {
        const base = id === candidateId ? cand : d.sessions.find((s) => s.id === id)!
        return put('sessions', { ...base, ...tm, breaks: base.breaks.filter((b) => b.start >= tm.start && b.end <= tm.end) })
      })
      return run({ put: puts, remove: [{ c: 'timerConflicts', id: candidateId }], purge: [{ c: 'timerConflicts', id: candidateId }] })
    },
    discardConflict(id: string) {
      return run({ remove: [{ c: 'timerConflicts', id }] })
    },

    // ───── 휴지통 ─────
    restore(collection: string, id: string) {
      return run({ restore: [{ c: collection as Collection, id }] })
    },
    purge(collection: string, id: string) {
      return run({ purge: [{ c: collection as Collection, id }] })
    },
  }
}
