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
  if (data.errorCauses.length === 0) data.errorCauses = DEFAULT_ERROR_CAUSES
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
      }
    })
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
  return data
}
