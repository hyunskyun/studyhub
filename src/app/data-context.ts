import { createContext, useContext } from 'react'
import type { Actions } from '../data/actions'
import type { AppData, Subject } from '../domain/types'

export type DataStatus = 'need-key' | 'loading' | 'ready' | 'error'

export interface DataState {
  data: AppData
  /** 'fixture'는 개발 모드 디자인 검수 전용(메모리, D1에 쓰지 않음) */
  mode: 'api' | 'fixture'
  status: DataStatus
  /** 불러오기 실패 메시지 */
  loadError?: string
  ready: boolean
  actions: Actions
  refresh: () => Promise<void>
  setFixture: (on: boolean) => void
  /** 이 기기에 저장할 개인 접근 키. null이면 삭제 */
  setAccessKey: (key: string | null) => void
  hasAccessKey: boolean
  subject: (id?: string) => Subject | undefined
  subjectName: (id?: string) => string
}

export const DataContext = createContext<DataState | null>(null)

export function useAppData(): DataState {
  const v = useContext(DataContext)
  if (!v) throw new Error('DataProvider 누락')
  return v
}

export function useActions() {
  return useAppData().actions
}
