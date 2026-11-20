// 개발 전용: fixture 데이터를 메모리에 올려 서버와 같은 규칙으로 저장을 흉내 낸다.
// 실제 D1에는 아무것도 쓰지 않으며 새로고침하면 초기 상태로 돌아간다.
import { COLLECTIONS, isCollection, validateBatch, type Collection, type RecordDoc, type StateResponse, type StoredDoc } from '../domain/collections'
import { formatTime } from '../domain/time'
import { StoreError, type Store } from '../data/store'
import { createFixtureData } from './fixtures'

export function createFixtureStore(now: number): Store {
  const fixture = createFixtureData(now)
  const db = new Map<Collection, Map<string, StoredDoc>>(COLLECTIONS.map((c) => [c, new Map()]))
  for (const c of COLLECTIONS) {
    const docs = (fixture as unknown as Record<string, RecordDoc[]>)[c] ?? []
    for (const d of docs) db.get(c)!.set(d.id, { data: structuredClone(d), deletedAt: null })
  }
  // fixture의 휴지통 항목은 제목만 있는 껍데기 문서로 넣는다
  for (const t of fixture.trash) {
    if (isCollection(t.collection)) db.get(t.collection)!.set(t.id, { data: { id: t.id, title: t.title, name: t.title, subjectId: '', start: t.deletedAt, end: t.deletedAt }, deletedAt: t.deletedAt })
  }
  let kv: StateResponse['kv'] = { activeTimer: fixture.activeTimer }

  return {
    kind: 'fixture',
    async load() {
      const state: StateResponse = { records: {}, trash: [], kv: structuredClone(kv) }
      for (const [c, docs] of db) {
        for (const d of docs.values()) {
          if (d.deletedAt) state.trash.push({ c, data: structuredClone(d.data), deletedAt: d.deletedAt })
          else (state.records[c] ??= []).push(structuredClone(d.data))
        }
      }
      return state
    },
    async batch(b) {
      const problem = validateBatch({ blocks: db.get('blocks')!, sessions: db.get('sessions')! }, b, (_c, d) => `${formatTime(String(d.start))}–${formatTime(String(d.end))}`)
      if (problem) throw new StoreError(409, problem)
      const at = new Date().toISOString()
      for (const p of b.put ?? []) db.get(p.c)!.set(p.data.id, { data: structuredClone(p.data), deletedAt: null })
      for (const r of b.remove ?? []) {
        const d = db.get(r.c)!.get(r.id)
        if (d && !d.deletedAt) d.deletedAt = at
      }
      for (const r of b.restore ?? []) {
        const d = db.get(r.c)!.get(r.id)
        if (d) d.deletedAt = null
      }
      for (const r of b.purge ?? []) if (db.get(r.c)!.get(r.id)?.deletedAt) db.get(r.c)!.delete(r.id)
      if (b.kv) {
        kv = { ...kv }
        for (const [k, v] of Object.entries(b.kv)) {
          if (v === null) delete kv[k as keyof typeof kv]
          else kv[k as keyof typeof kv] = structuredClone(v)
        }
      }
    },
  }
}
