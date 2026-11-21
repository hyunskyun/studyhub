// 학업 플래너 API (Cloudflare Workers + D1)
// - 모든 /api/* 요청은 개인 접근 키(Authorization: Bearer <ACCESS_KEY>)가 맞아야 처리한다.
// - 키가 설정되지 않았으면 모든 요청을 거부한다(fail closed).
import {
  isCollection,
  TRASH_RETENTION_DAYS,
  validateBatch,
  KV_KEYS,
  type Batch,
  type Collection,
  type RecordDoc,
  type StateResponse,
  type StoredDoc,
} from '../src/domain/collections.ts'
import { formatTime } from '../src/domain/time.ts'

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function error(status: number, message: string) {
  return json({ error: message }, status)
}

async function keyMatches(given: string, expected: string): Promise<boolean> {
  const enc = new TextEncoder()
  // 길이 차이로 인한 타이밍 노출을 막기 위해 해시끼리 비교
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ])
  return crypto.subtle.timingSafeEqual(a, b)
}

async function authorize(request: Request, env: Env): Promise<Response | null> {
  if (!env.ACCESS_KEY || env.ACCESS_KEY.length < 16) return error(500, '서버에 접근 키가 설정되지 않았습니다.')
  const header = request.headers.get('authorization') ?? ''
  const given = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!given || !(await keyMatches(given, env.ACCESS_KEY))) return error(401, '접근 키가 올바르지 않습니다.')
  return null
}

function retentionCutoff(now: Date) {
  return new Date(now.getTime() - TRASH_RETENTION_DAYS * 86_400_000).toISOString()
}

async function getState(env: Env): Promise<StateResponse> {
  const now = new Date()
  // 30일 지난 휴지통 항목 영구 삭제
  await env.DB.prepare('DELETE FROM records WHERE deleted_at IS NOT NULL AND deleted_at < ?').bind(retentionCutoff(now)).run()
  const [rows, kvRows] = await env.DB.batch([
    env.DB.prepare('SELECT collection, data, deleted_at FROM records'),
    env.DB.prepare('SELECT key, value FROM kv'),
  ])
  const state: StateResponse = { records: {}, trash: [], kv: {} }
  for (const r of rows.results as { collection: string; data: string; deleted_at: string | null }[]) {
    if (!isCollection(r.collection)) continue
    const data = JSON.parse(r.data) as RecordDoc
    if (r.deleted_at) state.trash.push({ c: r.collection, data, deletedAt: r.deleted_at })
    else (state.records[r.collection] ??= []).push(data)
  }
  for (const r of kvRows.results as { key: string; value: string }[]) {
    if ((KV_KEYS as readonly string[]).includes(r.key)) state.kv[r.key as (typeof KV_KEYS)[number]] = JSON.parse(r.value)
  }
  return state
}

function parseBatch(body: unknown): Batch | string {
  if (!body || typeof body !== 'object') return '요청 형식이 올바르지 않습니다.'
  const b = body as Batch
  const refsOk = (list: unknown) =>
    list === undefined || (Array.isArray(list) && list.every((r) => r && isCollection(r.c) && typeof r.id === 'string' && r.id.length > 0 && r.id.length <= 100))
  if (b.put !== undefined) {
    if (!Array.isArray(b.put)) return 'put 형식 오류'
    for (const p of b.put) {
      if (!p || !isCollection(p.c) || !p.data || typeof p.data.id !== 'string' || !p.data.id || p.data.id.length > 100) return 'put 항목 형식 오류'
    }
  }
  if (!refsOk(b.remove) || !refsOk(b.restore) || !refsOk(b.purge)) return '참조 형식 오류'
  if (b.kv !== undefined) {
    if (typeof b.kv !== 'object' || b.kv === null) return 'kv 형식 오류'
    for (const k of Object.keys(b.kv)) if (!(KV_KEYS as readonly string[]).includes(k)) return `알 수 없는 kv 키: ${k}`
  }
  return b
}

async function loadDocs(env: Env, c: Collection): Promise<Map<string, StoredDoc>> {
  const rows = await env.DB.prepare('SELECT id, data, deleted_at FROM records WHERE collection = ?').bind(c).all<{ id: string; data: string; deleted_at: string | null }>()
  return new Map(rows.results.map((r) => [r.id, { data: JSON.parse(r.data) as RecordDoc, deletedAt: r.deleted_at }]))
}

async function applyBatch(env: Env, batch: Batch): Promise<Response> {
  const touchesTimed = [...(batch.put ?? []), ...(batch.restore ?? [])].some((x) => x.c === 'blocks' || x.c === 'sessions')
  if (touchesTimed) {
    const [blocks, sessions] = await Promise.all([loadDocs(env, 'blocks'), loadDocs(env, 'sessions')])
    const problem = validateBatch({ blocks, sessions }, batch, (_c, d) => `${formatTime(String(d.start))}–${formatTime(String(d.end))}`)
    if (problem) return error(409, problem)
  }

  const now = new Date().toISOString()
  const stmts: D1PreparedStatement[] = []
  for (const p of batch.put ?? []) {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO records (collection, id, data, created_at, updated_at, deleted_at, rev)
         VALUES (?1, ?2, ?3, ?4, ?4, NULL, 1)
         ON CONFLICT (collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, deleted_at = NULL, rev = records.rev + 1`,
      ).bind(p.c, p.data.id, JSON.stringify(p.data), now),
    )
  }
  for (const r of batch.remove ?? [])
    stmts.push(env.DB.prepare('UPDATE records SET deleted_at = ?1, updated_at = ?1, rev = rev + 1 WHERE collection = ?2 AND id = ?3 AND deleted_at IS NULL').bind(now, r.c, r.id))
  for (const r of batch.restore ?? [])
    stmts.push(env.DB.prepare('UPDATE records SET deleted_at = NULL, updated_at = ?1, rev = rev + 1 WHERE collection = ?2 AND id = ?3').bind(now, r.c, r.id))
  for (const r of batch.purge ?? [])
    stmts.push(env.DB.prepare('DELETE FROM records WHERE collection = ?1 AND id = ?2 AND deleted_at IS NOT NULL').bind(r.c, r.id))
  for (const [key, value] of Object.entries(batch.kv ?? {})) {
    stmts.push(
      value === null
        ? env.DB.prepare('DELETE FROM kv WHERE key = ?').bind(key)
        : env.DB.prepare('INSERT INTO kv (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(key, JSON.stringify(value), now),
    )
  }
  if (stmts.length) await env.DB.batch(stmts) // D1 batch = 하나의 트랜잭션
  return json({ ok: true })
}

// Android 앱(Capacitor) 안의 화면 출처. 이 출처만 교차 출처 요청을 허용한다 (접근 키는 여전히 필요).
const APP_ORIGINS = new Set(['https://localhost'])

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin')
  if (!origin || !APP_ORIGINS.has(origin)) return {}
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

function withCors(res: Response, request: Request): Response {
  const extra = corsHeaders(request)
  if (!Object.keys(extra).length) return res
  const out = new Response(res.body, res)
  for (const [k, v] of Object.entries(extra)) out.headers.set(k, v)
  return out
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return new Response(null, { status: 404 })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) })
    return withCors(await handleApi(request, env, url), request)
  },
} satisfies ExportedHandler<Env>

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const denied = await authorize(request, env)
  if (denied) return denied

  try {
    if (url.pathname === '/api/state' && request.method === 'GET') return json(await getState(env))
    if (url.pathname === '/api/batch' && request.method === 'POST') {
      const text = await request.text()
      if (text.length > 2_000_000) return error(413, '요청이 너무 큽니다.')
      const parsed = parseBatch(JSON.parse(text))
      if (typeof parsed === 'string') return error(400, parsed)
      return await applyBatch(env, parsed)
    }
    return error(404, '없는 API입니다.')
  } catch (e) {
    console.error(e)
    return error(500, '서버 오류가 발생했습니다.')
  }
}
