import type { Collection, StateResponse } from '../domain/collections'
import { formatTime } from '../domain/time'
import type { ActiveTimer, AppData, RecordKind, TrashItem } from '../domain/types'
import { createEmptyData, DEFAULT_ERROR_CAUSES } from './empty'

const KIND: Partial<Record<Collection, RecordKind>> = {
  subjects: 'subject',
  blocks: 'block',
  events: 'event',
  todos: 'todo',
  workbooks: 'workbook',
  sessions: 'session',
  timerConflicts: 'session',
  mockExams: 'mockExam',
  schoolExams: 'schoolExam',
  projects: 'project',
  courses: 'course',
  driveFiles: 'driveLink',
}

/** 서버 상태 → 화면용 AppData */
export function buildData(state: StateResponse): AppData {
  const data = createEmptyData()
  for (const [c, docs] of Object.entries(state.records) as [Collection, unknown[]][]) {
    ;(data as unknown as Record<string, unknown[]>)[c] = docs
  }
  // 기본 오답 원인 + 사용자가 추가·수정한 것 (같은 ID면 저장본 우선)
  const stored = new Map(data.errorCauses.map((c) => [c.id, c]))
  data.errorCauses = [...DEFAULT_ERROR_CAUSES.map((c) => stored.get(c.id) ?? c), ...data.errorCauses.filter((c) => !DEFAULT_ERROR_CAUSES.some((x) => x.id === c.id))]
  data.activeTimer = (state.kv.activeTimer as ActiveTimer | undefined) ?? undefined
  data.timetable = [...data.timetable].sort((a, b) => a.weekday - b.weekday || a.period - b.period)

  const subjectName = (id: unknown) =>
    [...data.subjects, ...state.trash.filter((t) => t.c === 'subjects').map((t) => t.data as unknown as { id: string; name: string })].find(
      (s) => s.id === id,
    )?.name ?? '과목'

  data.trash = state.trash
    .map((t): TrashItem => {
      const d = t.data as Record<string, unknown>
      const title =
        t.c === 'blocks' || t.c === 'sessions' || t.c === 'timerConflicts'
          ? `${subjectName(d.subjectId)} ${formatTime(String(d.start))}–${formatTime(String(d.end))}`
          : String(d.title ?? d.name ?? '이름 없음')
      return {
        id: String(d.id),
        collection: t.c,
        kind: KIND[t.c] ?? 'todo',
        title,
        deletedAt: t.deletedAt,
        relatedCount: t.c === 'todos' && Array.isArray(d.subtasks) && d.subtasks.length ? d.subtasks.length : undefined,
        raw: d,
      }
    })
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
  // 프로젝트와 함께 삭제된 할 일은 프로젝트 항목에 묶어서 표시
  const withProject = new Map<string, number>()
  for (const t of data.trash) {
    const pid = t.raw?.deletedWithProject
    if (typeof pid === 'string') withProject.set(pid, (withProject.get(pid) ?? 0) + 1)
  }
  const trashedProjects = new Set(data.trash.filter((t) => t.collection === 'projects').map((t) => t.id))
  data.trash = data.trash.map((t) => {
    const pid = t.raw?.deletedWithProject
    if (typeof pid === 'string' && trashedProjects.has(pid)) return { ...t, groupedUnder: pid }
    if (t.collection === 'projects' && withProject.has(t.id)) return { ...t, relatedCount: withProject.get(t.id) }
    return t
  })
  return data
}
