import type { AppData, ErrorCause } from '../domain/types'

/** 오답 원인 기본 목록 (Q25: 기본 제공 + 사용자 추가·수정·비활성화). 예시 데이터가 아닌 시스템 기본값. */
export const DEFAULT_ERROR_CAUSES: ErrorCause[] = [
  { id: 'cause-concept', name: '개념 부족', active: true },
  { id: 'cause-calc', name: '계산 실수', active: true },
  { id: 'cause-read', name: '문제 해석', active: true },
  { id: 'cause-time', name: '시간 부족', active: true },
  { id: 'cause-careless', name: '단순 실수', active: true },
]

/** 신규 사용자 상태: 모든 기록 0건 (Q155) */
export function createEmptyData(): AppData {
  return {
    subjects: [],
    blocks: [],
    events: [],
    todos: [],
    workbooks: [],
    sessions: [],
    timerConflicts: [],
    mockExams: [],
    errorCauses: DEFAULT_ERROR_CAUSES,
    schoolExams: [],
    projects: [],
    academies: [],
    courses: [],
    classes: [],
    homeworkWeeks: [],
    goals: [],
    timetable: [],
    driveFiles: [],
    trash: [],
    archive: [],
  }
}
