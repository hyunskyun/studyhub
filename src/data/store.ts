import type { Batch, StateResponse } from '../domain/collections'

/** 데이터 저장소 계약: 서버(D1 API) 또는 개발용 메모리 저장소 */
export interface Store {
  readonly kind: 'api' | 'fixture'
  load(): Promise<StateResponse>
  /** 원자적으로 적용. 규칙 위반 시 StoreError(409) */
  batch(b: Batch): Promise<void>
}

export class StoreError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'StoreError'
    this.status = status
  }
}

/** Cloudflare Worker + D1 API */
export function createApiStore(accessKey: string): Store {
  async function call(path: string, init?: RequestInit) {
    let res: Response
    try {
      res = await fetch(path, {
        ...init,
        headers: { ...init?.headers, authorization: `Bearer ${accessKey}`, 'content-type': 'application/json' },
      })
    } catch {
      throw new StoreError(0, '서버에 연결할 수 없습니다. 인터넷 연결을 확인하세요.')
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new StoreError(res.status, body?.error ?? `요청 실패 (${res.status})`)
    }
    return res.json()
  }
  return {
    kind: 'api',
    load: () => call('/api/state') as Promise<StateResponse>,
    batch: async (b) => {
      await call('/api/batch', { method: 'POST', body: JSON.stringify(b) })
    },
  }
}
