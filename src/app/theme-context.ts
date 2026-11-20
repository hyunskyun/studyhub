import { createContext, useContext } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'

export interface ThemeState {
  pref: ThemePref
  resolved: 'light' | 'dark'
  setPref: (p: ThemePref) => void
}

export const ThemeContext = createContext<ThemeState | null>(null)

export function useTheme(): ThemeState {
  const v = useContext(ThemeContext)
  if (!v) throw new Error('ThemeProvider 누락')
  return v
}
