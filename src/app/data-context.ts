import { createContext, useContext } from 'react'
import type { AppData, Subject } from '../domain/types'

export interface DataState {
  data: AppData
  /** 'fixture'는 개발 모드 디자인 검수 전용 */
  mode: 'empty' | 'fixture'
  ready: boolean
  setFixture: (on: boolean) => void
  subject: (id?: string) => Subject | undefined
  subjectName: (id?: string) => string
}

export const DataContext = createContext<DataState | null>(null)

export function useAppData(): DataState {
  const v = useContext(DataContext)
  if (!v) throw new Error('DataProvider 누락')
  return v
}
