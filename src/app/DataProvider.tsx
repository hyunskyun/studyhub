import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createEmptyData } from '../data/empty'
import { emptyRepository, type AppRepository } from '../data/repository'
import type { AppData } from '../domain/types'
import { DataContext } from './data-context'
import { readPref, writePref } from './storage'

const FIXTURE_KEY = 'dev:fixture'

async function pickRepository(fixture: boolean): Promise<AppRepository> {
  if (import.meta.env.DEV && fixture) {
    const { createFixtureRepository } = await import('../dev/fixtures')
    return createFixtureRepository(Date.now())
  }
  return emptyRepository
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [fixture, setFixtureState] = useState(
    () => import.meta.env.DEV && (readPref(FIXTURE_KEY) === '1' || location.search.includes('fixture=1')),
  )
  const [loaded, setLoaded] = useState<{ fixture: boolean; data: AppData } | null>(null)

  useEffect(() => {
    let alive = true
    pickRepository(fixture)
      .then((r) => r.load())
      .then((data) => {
        if (alive) setLoaded({ fixture, data })
      })
    return () => {
      alive = false
    }
  }, [fixture])

  const value = useMemo(() => {
    const data = loaded?.data ?? createEmptyData()
    const byId = new Map(data.subjects.map((s) => [s.id, s]))
    return {
      data,
      mode: (loaded?.fixture ? 'fixture' : 'empty') as 'empty' | 'fixture',
      ready: loaded !== null && loaded.fixture === fixture,
      setFixture: (on: boolean) => {
        if (!import.meta.env.DEV) return
        writePref(FIXTURE_KEY, on ? '1' : null)
        setFixtureState(on)
      },
      subject: (id?: string) => (id ? byId.get(id) : undefined),
      subjectName: (id?: string) => (id ? (byId.get(id)?.name ?? '삭제된 과목') : '과목 없음'),
    }
  }, [loaded, fixture])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
