import type { Batch, Collection, RecordDoc } from '../domain/collections'
import { studyDayOf } from '../domain/time'
import type { AppData, Project, Todo } from '../domain/types'

export const uuid = () => crypto.randomUUID()

export const put = <T extends { id: string }>(c: Collection, data: T) => ({ c, data: data as unknown as RecordDoc })

export interface Ctx {
  run: (b: Batch) => Promise<void>
  get: () => AppData
}

/** 완료 학습일 표시: 완료로 바뀌면 오늘 학습일, 미완료가 되면 지움 (Q12 집계 전용) */
export function stampTodo(prev: Todo | undefined, next: Todo): Todo {
  if (next.done && !prev?.done) return { ...next, completedDay: studyDayOf(Date.now()) }
  if (!next.done && next.completedDay) {
    const { completedDay: _drop, ...rest } = next
    void _drop
    return rest
  }
  return next
}

/** 수행평가 단계와 연결된 할 일의 완료 상태를 단계에 반영 (Q120) */
export function stepSyncPuts(projects: Project[], todos: Todo[]) {
  const changed = new Map<string, Project>()
  for (const t of todos) {
    if (!t.projectStepId) continue
    const p = changed.get(projects.find((x) => x.steps.some((s) => s.id === t.projectStepId))?.id ?? '') ?? projects.find((x) => x.steps.some((s) => s.id === t.projectStepId))
    if (!p) continue
    const step = p.steps.find((s) => s.id === t.projectStepId)!
    if (step.done === t.done) continue
    changed.set(p.id, { ...p, steps: p.steps.map((s) => (s.id === step.id ? { ...s, done: t.done } : s)) })
  }
  return [...changed.values()].map((p) => put('projects', p))
}
