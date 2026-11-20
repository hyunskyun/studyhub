// 클라이언트와 Worker가 함께 쓰는 저장 단위·변경 묶음(Batch)·서버 검증 규칙.
import { overlaps } from './time.ts'
import type { StudySession, TimeBlock } from './types.ts'

export const COLLECTIONS = [
  'subjects',
  'blocks',
  'events',
  'todos',
  'workbooks',
  'sessions',
  'timerConflicts',
  'mockExams',
  'errorCauses',
  'schoolExams',
  'projects',
  'academies',
  'courses',
  'classes',
  'homeworkWeeks',
  'goals',
  'timetable',
  'driveFiles',
] as const

export type Collection = (typeof COLLECTIONS)[number]

export const KV_KEYS = ['activeTimer'] as const
export type KvKey = (typeof KV_KEYS)[number]

export function isCollection(v: unknown): v is Collection {
  return typeof v === 'string' && (COLLECTIONS as readonly string[]).includes(v)
}

export interface RecordRef {
  c: Collection
  id: string
}

export interface RecordDoc {
  id: string
  [k: string]: unknown
}

/** 한 번에 원자적으로 적용되는 변경 묶음 */
export interface Batch {
  put?: { c: Collection; data: RecordDoc }[]
  /** 휴지통으로 이동 (30일 보관) */
  remove?: RecordRef[]
  /** 휴지통에서 복원 */
  restore?: RecordRef[]
  /** 영구 삭제 */
  purge?: RecordRef[]
  /** null이면 삭제 */
  kv?: Partial<Record<KvKey, unknown>>
}

export interface StoredDoc {
  data: RecordDoc
  deletedAt: string | null
}

export interface StateResponse {
  records: Partial<Record<Collection, RecordDoc[]>>
  trash: { c: Collection; data: RecordDoc; deletedAt: string }[]
  kv: Partial<Record<KvKey, unknown>>
}

export const TRASH_RETENTION_DAYS = 30

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

/**
 * 변경 묶음을 적용한 뒤의 상태가 규칙을 지키는지 검사한다.
 * - 학습 계획 블록끼리 시간 중복 금지 (Q69), 복원 시에도 동일 (Q144)
 * - 확정된 실제 학습 기록끼리 시간 중복 금지 (Q84)
 * current: 해당 컬렉션의 현재 문서(휴지통 포함)
 * 위반 시 사용자에게 보여줄 메시지를 반환, 문제없으면 null.
 */
export function validateBatch(
  current: { blocks: Map<string, StoredDoc>; sessions: Map<string, StoredDoc> },
  batch: Batch,
  describe: (c: 'blocks' | 'sessions', doc: RecordDoc) => string = (_c, d) => String(d.id),
): string | null {
  for (const c of ['blocks', 'sessions'] as const) {
    const next = new Map(current[c])
    const touched = new Set<string>()
    for (const p of batch.put ?? []) {
      if (p.c !== c) continue
      next.set(p.data.id, { data: p.data, deletedAt: null })
      touched.add(p.data.id)
    }
    for (const r of batch.restore ?? []) {
      const cur = r.c === c ? next.get(r.id) : undefined
      if (!cur) continue
      next.set(r.id, { ...cur, deletedAt: null })
      touched.add(r.id)
    }
    for (const r of [...(batch.remove ?? []), ...(batch.purge ?? [])]) if (r.c === c) next.delete(r.id)

    const live = [...next.values()].filter((d) => !d.deletedAt).map((d) => d.data as unknown as TimeBlock | StudySession)
    for (const id of touched) {
      const a = live.find((x) => x.id === id)
      if (!a) continue
      if (Date.parse(a.end) <= Date.parse(a.start)) return '종료 시각은 시작 시각보다 늦어야 합니다.'
      const clash = live.find((b) => b.id !== a.id && overlaps(a.start, a.end, b.start, b.end))
      if (clash)
        return c === 'blocks'
          ? `다른 학습 계획(${describe(c, clash as unknown as RecordDoc)})과 시간이 겹쳐 저장할 수 없습니다.`
          : `기존 공부 기록(${describe(c, clash as unknown as RecordDoc)})과 시간이 겹쳐 저장할 수 없습니다.`
    }
  }
  return null
}
