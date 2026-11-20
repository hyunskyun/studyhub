// 화면에서 공통으로 쓰는 파생 계산 (순수 함수)
import {
  dDay,
  isOverdue,
  minutesBetween,
  overlaps,
  splitMinutesByStudyDay,
  type DateStr,
} from './time'
import type {
  AcademyClass,
  AppData,
  MockAttempt,
  Priority,
  SchoolExam,
  StudySession,
  Todo,
  Workbook,
} from './types'

export const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
export const PRIORITY_LABEL: Record<Priority, string> = { high: '높음', medium: '보통', low: '낮음' }

/** 일반 할 일 정렬: 높음→보통→낮음, 같으면 마감 빠른 순, 마감 없음은 뒤 (Q34, Q127) */
export function sortTodos(todos: Todo[]): Todo[] {
  const key = (t: Todo) => (t.due ? `${t.due.date}T${t.due.time ?? '99:99'}` : '9999')
  return [...todos].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || key(a).localeCompare(key(b)),
  )
}

export function todoProgress(t: Todo, partDone: (id: string) => boolean) {
  const total = t.subtasks.length + t.partIds.length
  const done = t.subtasks.filter((s) => s.done).length + t.partIds.filter(partDone).length
  return { total, done }
}

/**
 * 하위 항목/Part 변화 후 자동 완료 재계산.
 * 하위 항목과 Part가 모두 있으면 두 그룹 모두 완료되어야 자동 완료 (Q32, Q60, Q65).
 * 자동 완료 상태에서 하나라도 취소되면 자동 미완료 (Q66).
 * 사용자가 직접 완료 취소한 경우(done=false, autoCompleted=false)는 즉시 재완료하지 않음 (Q67) —
 * 이 판단은 호출 측에서 '직접 취소 이후 변화가 있었는지'로 결정한다.
 */
export function recomputeAutoComplete(t: Todo, partDone: (id: string) => boolean): Todo {
  const { total, done } = todoProgress(t, partDone)
  if (total === 0) return t
  if (done === total && !t.done) return { ...t, done: true, autoCompleted: true }
  if (done < total && t.done && t.autoCompleted) return { ...t, done: false, autoCompleted: false }
  return t
}

/** 상위 직접 체크: 남은 하위 항목 모두 완료 (Q62). 직접 취소: 하위 체크 유지 (Q67) */
export function setTodoDoneManually(t: Todo, done: boolean): Todo {
  if (done) return { ...t, done: true, autoCompleted: false, subtasks: t.subtasks.map((s) => ({ ...s, done: true })) }
  return { ...t, done: false, autoCompleted: false }
}

export function todoOverdue(t: Todo, now: number) {
  return !t.done && !!t.due && isOverdue(t.due, now)
}

export function partIndex(workbooks: Workbook[]) {
  const map = new Map<string, { done: boolean; label: string; workbook: string; unit: string }>()
  for (const w of workbooks)
    for (const u of w.units)
      for (const p of u.parts) map.set(p.id, { done: p.done, label: p.label, workbook: w.title, unit: u.title })
  return map
}

export function workbookProgress(w: Workbook) {
  const parts = w.units.flatMap((u) => u.parts)
  const done = parts.filter((p) => p.done).length
  return { total: parts.length, done, complete: parts.length > 0 && done === parts.length }
}

/** 시험 범위 진행률: 고유 Part 기준, 중복 집계 금지 (Q31) */
export function scopeProgress(exam: SchoolExam, workbooks: Workbook[]) {
  const idx = partIndex(workbooks)
  const unique = [...new Set(exam.scopePartIds)]
  const done = unique.filter((id) => idx.get(id)?.done).length
  return { total: unique.length, done }
}

/** 휴식을 제외한 실제 자습 분 (Q45) */
export function sessionStudyMinutes(s: StudySession): number {
  const brk = s.breaks.reduce((sum, b) => sum + minutesBetween(b.start, b.end), 0)
  return Math.max(0, minutesBetween(s.start, s.end) - brk)
}

export function sessionBreakMinutes(s: StudySession): number {
  return s.breaks.reduce((sum, b) => sum + minutesBetween(b.start, b.end), 0)
}

/** 학습일별 자습 분 (05:00 경계 분할, 휴식은 비율 무관하게 해당 구간에서 차감) */
export function studyMinutesByDay(sessions: StudySession[]): Record<DateStr, number> {
  const out: Record<DateStr, number> = {}
  for (const s of sessions) {
    const add = (start: string, end: string, sign: 1 | -1) => {
      for (const [day, min] of Object.entries(splitMinutesByStudyDay(start, end)))
        out[day] = (out[day] ?? 0) + sign * min
    }
    add(s.start, s.end, 1)
    for (const b of s.breaks) add(b.start, b.end, -1)
  }
  return out
}

/** 출석 확인된 학원 수업만 실제 시간으로 집계 (Q41–42) */
export function academyMinutesByDay(classes: AcademyClass[]): Record<DateStr, number> {
  const out: Record<DateStr, number> = {}
  for (const c of classes) {
    if (c.status !== 'attended' && c.status !== 'makeup') continue
    for (const [day, min] of Object.entries(splitMinutesByStudyDay(c.start, c.end)))
      out[day] = (out[day] ?? 0) + min
  }
  return out
}

/** 확정 학습 기록과 겹치는 기존 기록 (Q84, Q138) */
export function findSessionConflicts(
  sessions: StudySession[],
  candidate: { start: string; end: string },
  ignoreId?: string,
) {
  return sessions.filter((s) => s.id !== ignoreId && overlaps(s.start, s.end, candidate.start, candidate.end))
}

/** 오답 판정: 확정 전에는 미입력 문항을 정답으로 간주하지 않음 (Q95, Q132, Q145) */
export function attemptJudgement(attempt: MockAttempt, totalQuestions?: number) {
  const outOfRange = totalQuestions
    ? attempt.wrong.filter((w) => w.question < 1 || w.question > totalQuestions)
    : []
  if (!attempt.wrongConfirmed || !totalQuestions || outOfRange.length > 0) {
    return { state: 'unconfirmed' as const, wrong: attempt.wrong.length, correct: undefined, outOfRange }
  }
  return {
    state: 'confirmed' as const,
    wrong: attempt.wrong.length,
    correct: totalQuestions - attempt.wrong.length,
    outOfRange,
  }
}

export interface HomeDeadline {
  id: string
  kind: 'schoolExam' | 'mockExam' | 'project'
  title: string
  date: DateStr
  dday: number
}

/** 다가오는 시험·수행평가. 오늘/내일은 홈 최상단 (Q35, Q54) */
export function upcomingDeadlines(data: AppData, now: number, subjectName: (id: string) => string) {
  const items: HomeDeadline[] = []
  for (const e of data.schoolExams)
    items.push({
      id: e.id,
      kind: 'schoolExam',
      title: `${subjectName(e.subjectId)} ${e.term === 'midterm' ? '중간' : '기말'}고사`,
      date: e.date,
      dday: dDay(e.date, now),
    })
  for (const p of data.projects)
    if (!p.submitted)
      items.push({ id: p.id, kind: 'project', title: p.title, date: p.due.date, dday: dDay(p.due.date, now) })
  return items.filter((i) => i.dday >= 0).sort((a, b) => a.dday - b.dday)
}
