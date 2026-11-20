import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { readPref, writePref } from './storage'
import { ThemeContext, type ThemePref } from './theme-context'

const KEY = 'pref:theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function subscribe(cb: () => void) {
  const m = media()
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => (readPref(KEY) as ThemePref) ?? 'system')
  const systemDark = useSyncExternalStore(subscribe, () => media().matches)
  const resolved = pref === 'system' ? (systemDark ? 'dark' : 'light') : pref

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#0e0f11' : '#f6f6f7')
  }, [resolved])

  const value = useMemo(
    () => ({
      pref,
      resolved,
      setPref: (p: ThemePref) => {
        writePref(KEY, p)
        setPrefState(p)
      },
    }),
    [pref, resolved],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
