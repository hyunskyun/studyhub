import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createActions } from '../data/actions'
import { buildData } from '../data/buildData'
import { createEmptyData } from '../data/empty'
import { createApiStore, StoreError, type Store } from '../data/store'
import type { AppData } from '../domain/types'
import { DataContext, type DataStatus } from './data-context'
import { readPref, writePref } from './storage'

const FIXTURE_KEY = 'dev:fixture'
/** 개인 접근 키: 이 기기의 브라우저 저장소에만 보관 */
const ACCESS_KEY = 'auth:accessKey'

async function createStore(fixture: boolean, key: string | null): Promise<Store | null> {
  if (import.meta.env.DEV && fixture) {
    const { createFixtureStore } = await import('../dev/memoryStore')
    return createFixtureStore(Date.now())
  }
  return key ? createApiStore(key) : null
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [fixture, setFixtureState] = useState(
    () => import.meta.env.DEV && (readPref(FIXTURE_KEY) === '1' || location.search.includes('fixture=1')),
  )
  const [accessKey, setAccessKeyState] = useState<string | null>(() => readPref(ACCESS_KEY))
  const [store, setStore] = useState<Store | null>(null)
  const [data, setData] = useState<AppData>(createEmptyData)
  const [status, setStatus] = useState<DataStatus>('loading')
  const [loadError, setLoadError] = useState<string>()

  const load = useCallback(async (s: Store) => {
    try {
      setData(buildData(await s.load()))
      setStatus('ready')
      setLoadError(undefined)
    } catch (e) {
      if (e instanceof StoreError && e.status === 401) {
        setStatus('need-key')
        setLoadError(e.message)
      } else {
        setStatus('error')
        setLoadError(e instanceof Error ? e.message : '불러오기 실패')
      }
    }
  }, [])

  useEffect(() => {
    let alive = true
    createStore(fixture, accessKey).then((s) => {
      if (!alive) return
      setStore(s)
      if (!s) {
        setStatus('need-key')
        return
      }
      setStatus('loading')
      load(s)
    })
    return () => {
      alive = false
    }
  }, [fixture, accessKey, load])

  const value = useMemo(() => {
    const byId = new Map(data.subjects.map((s) => [s.id, s]))
    const refresh = async () => {
      if (store) await load(store)
    }
    const noStore: Store = {
      kind: 'api',
      load: async () => {
        throw new StoreError(401, '접근 키가 필요합니다.')
      },
      batch: async () => {
        throw new StoreError(401, '접근 키가 필요합니다.')
      },
    }
    return {
      data,
      mode: (store?.kind ?? 'api') as 'api' | 'fixture',
      status,
      loadError,
      ready: status === 'ready',
      actions: createActions(store ?? noStore, () => data, refresh),
      refresh,
      setFixture: (on: boolean) => {
        if (!import.meta.env.DEV) return
        writePref(FIXTURE_KEY, on ? '1' : null)
        setFixtureState(on)
      },
      setAccessKey: (key: string | null) => {
        writePref(ACCESS_KEY, key)
        setAccessKeyState(key)
      },
      hasAccessKey: !!accessKey,
      subject: (id?: string) => (id ? byId.get(id) : undefined),
      subjectName: (id?: string) => (id ? (byId.get(id)?.name ?? '삭제된 과목') : '과목 없음'),
    }
  }, [data, store, status, loadError, load, accessKey])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
