import type { AppData } from '../domain/types'
import { createEmptyData } from './empty'

/**
 * 데이터 저장소 계약.
 * UI 단계: 읽기 전용 스냅샷만 제공한다.
 * 2단계: Dexie(IndexedDB) 구현으로 교체하고 엔터티별 CRUD를 추가한다.
 * 3단계: 변경 큐 + D1 동기화 어댑터를 이 인터페이스 뒤에 둔다.
 */
export interface AppRepository {
  readonly kind: 'empty' | 'fixture' | 'local'
  load(): Promise<AppData>
}

/** 실제 사용자 기본 저장소 (현재 0건). 2단계에서 Dexie 구현으로 교체 예정. */
export const emptyRepository: AppRepository = {
  kind: 'empty',
  load: async () => createEmptyData(),
}
