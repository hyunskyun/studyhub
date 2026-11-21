// UI 단계용 도메인 타입. 2단계(로컬 DB)·3단계(D1 동기화)에서 필드가 추가될 수 있다.
// 모든 관계는 ID로 연결한다(이름 변경·휴지통 복원에도 관계 유지).

import type { DateStr, Due } from './time'

export type ID = string

/** 수능/내신 태그: 둘 다, 하나만, 둘 다 없음 모두 허용 (Q1, Q118) */
export type ExamTag = 'suneung' | 'naesin'

export type Priority = 'high' | 'medium' | 'low'

export interface Subject {
  id: ID
  name: string
  /** 대분류 → 세부 과목 (Q2) */
  parentId?: ID
  /** 디자인 토큰의 과목 색상 인덱스 */
  color: number
}

export type ActivityRef =
  | { kind: 'workbook'; id: ID }
  | { kind: 'project'; id: ID }
  | { kind: 'todo'; id: ID }

/** 학습 계획 시간 블록 (Q68–69) */
export interface TimeBlock {
  id: ID
  subjectId: ID
  tags: ExamTag[]
  activity?: ActivityRef
  start: string
  end: string
}

export type EventKind = 'school' | 'academy' | 'personal'

export interface CalendarEvent {
  id: ID
  title: string
  kind: EventKind
  start: string
  end: string
  /** 주간 반복 (Q11). 수정 범위 선택(Q131), 삭제는 한 회차(Q142) */
  recurrence?: { weekdays: number[] }
  /** 반복 일정에서 개별 삭제된 회차의 날짜 (Q142) */
  exceptDates?: DateStr[]
}

export interface Subtask {
  id: ID
  title: string
  done: boolean
  dueDate?: DateStr
}

export interface Todo {
  id: ID
  title: string
  subjectId?: ID
  tags: ExamTag[]
  due?: Due
  priority: Priority
  done: boolean
  /** 하위 항목/Part 완료로 자동 완료되었는지 (Q66–67) */
  autoCompleted?: boolean
  subtasks: Subtask[]
  partIds: ID[]
  projectStepId?: ID
  /** 완료된 학습일 (일간 완료 수 목표 집계 전용, 화면에 표시하지 않음: Q12·Q58) */
  completedDay?: DateStr
  /** 수행평가와 함께 휴지통으로 간 경우 그 프로젝트 ID (함께 복원: Q135) */
  deletedWithProject?: ID
}

export interface Part {
  id: ID
  label: string
  done: boolean
  /** 완료된 학습일 (Part 수 목표 집계 전용) */
  doneDay?: DateStr
}

export interface WorkbookUnit {
  id: ID
  title: string
  parts: Part[]
}

export interface Workbook {
  id: ID
  title: string
  subjectId: ID
  units: WorkbookUnit[]
}

export interface StudyBreak {
  start: string
  end: string
}

/** 확정된 실제 자습 기록. 확정 기록 간 시간 중복 금지 (Q84) */
export interface StudySession {
  id: ID
  subjectId: ID
  tags: ExamTag[]
  start: string
  end: string
  breaks: StudyBreak[]
  planBlockId?: ID
  activity?: ActivityRef
  source: 'timer' | 'manual'
}

/** 실행 중인 타이머 (계정당 1개: Q71) */
export interface ActiveTimer {
  subjectId: ID
  tags: ExamTag[]
  activity?: ActivityRef
  planBlockId?: ID
  segmentStart: string
  /** 현재 구간에서 끝난 휴식들 */
  breaks?: StudyBreak[]
  /** 휴식 중이면 휴식 시작 시각 */
  breakStart?: string
  /** 타이머를 조작할 수 있는 기기 (다른 기기는 읽기 전용: Q148) */
  ownerDeviceId?: string
  ownerDeviceName?: string
}

export interface MockScores {
  raw?: number
  standard?: number
  percentile?: number
  grade?: number
}

export interface WrongAnswer {
  question: number
  causeId: ID
  memo?: string
}

export interface MockAttempt {
  id: ID
  attemptNo: number
  solvedDate: DateStr
  scores: MockScores
  wrong: WrongAnswer[]
  /** 오답 입력 완료 확정 (Q95, Q132) */
  wrongConfirmed: boolean
}

export interface MockExam {
  id: ID
  year: number
  month: number
  org: string
  subjectId: ID
  originalDate: DateStr
  totalQuestions?: number
  attempts: MockAttempt[]
}

export interface ErrorCause {
  id: ID
  name: string
  active: boolean
}

export interface SchoolExam {
  id: ID
  year: number
  semester: 1 | 2
  term: 'midterm' | 'final'
  subjectId: ID
  date: DateStr
  raw?: number
  grade?: number
  scopePartIds: ID[]
}

export interface ProjectStep {
  id: ID
  title: string
  due?: DateStr
  done: boolean
  todoId?: ID
}

export interface Project {
  id: ID
  subjectId: ID
  title: string
  due: Due
  criteria?: string
  totalScore?: number
  earnedScore?: number
  /** 세부 단계 완료와 제출은 별개 (Q104) */
  submitted: boolean
  steps: ProjectStep[]
}

export interface Academy {
  id: ID
  name: string
}

export interface CourseSlot {
  weekday: number
  start: string
  end: string
}

export interface Course {
  id: ID
  academyId: ID
  subjectId: ID
  title: string
  teacher?: string
  slots: CourseSlot[]
  homeworkTemplate: string[]
}

export type ClassStatus = 'scheduled' | 'attended' | 'absent' | 'cancelled' | 'makeup'

export interface AcademyClass {
  id: ID
  courseId: ID
  date: DateStr
  /** 출석 기록 시 실제 시각으로 수정 가능 (Q42, Q107) */
  start: string
  end: string
  status: ClassStatus
  /** 보강 수업 */
  makeup?: boolean
}

export interface HomeworkItem {
  id: ID
  title: string
  done: boolean
  /** 템플릿의 몇 번째 줄에서 왔는지 (템플릿 변경 반영용) */
  templateIndex?: number
  /** 사용자가 이 주차에서 직접 수정한 필드는 템플릿 변경에도 보존 (Q134) */
  overridden?: boolean
}

export interface HomeworkWeek {
  id: ID
  courseId: ID
  weekOf: DateStr
  due: DateStr
  items: HomeworkItem[]
  /** 강좌 삭제 후에도 표시할 과거 이름 (Q136) */
  courseTitle?: string
  academyName?: string
}

export type GoalPeriod = 'day' | 'week' | 'month'
export type GoalMetric = 'minutes' | 'parts' | 'todos'

export interface Goal {
  id: ID
  /** undefined = 전체 목표 */
  subjectId?: ID
  period: GoalPeriod
  metric: GoalMetric
  target: number
}

export interface TimetableSlot {
  /** `${weekday}-${period}` */
  id?: ID
  weekday: number
  period: number
  subject: string
  start: string
  end: string
}

export type LinkKind = 'workbook' | 'project' | 'todo'

export interface DriveFile {
  id: ID
  name: string
  mimeType: string
  path: string
  status: 'ok' | 'inaccessible'
  links: { kind: LinkKind; id: ID }[]
}

export type RecordKind =
  | 'todo'
  | 'workbook'
  | 'project'
  | 'schoolExam'
  | 'mockExam'
  | 'block'
  | 'course'
  | 'subject'
  | 'driveLink'
  | 'session'
  | 'event'

export interface TrashItem {
  id: ID
  /** 저장 컬렉션 이름 (복원·영구 삭제 대상 지정) */
  collection: string
  kind: RecordKind
  title: string
  deletedAt: string
  /** 함께 이동된 연결 항목 수 (예: 하위 할 일) */
  relatedCount?: number
  /** 원본 문서 (복원 시 연결 관계 확인용) */
  raw?: Record<string, unknown>
  /** 다른 항목(수행평가)과 함께 삭제되어 그 항목 아래에 묶여 표시됨 */
  groupedUnder?: string
}

export interface ArchiveItem {
  id: ID
  kind: RecordKind
  title: string
  label: string
}

export interface AppData {
  subjects: Subject[]
  blocks: TimeBlock[]
  events: CalendarEvent[]
  todos: Todo[]
  workbooks: Workbook[]
  sessions: StudySession[]
  activeTimer?: ActiveTimer
  /** 오프라인 동시 실행 등으로 생긴 충돌 후보: 사용자가 해결해야 확정 (Q82) */
  timerConflicts: StudySession[]
  mockExams: MockExam[]
  errorCauses: ErrorCause[]
  schoolExams: SchoolExam[]
  projects: Project[]
  academies: Academy[]
  courses: Course[]
  classes: AcademyClass[]
  homeworkWeeks: HomeworkWeek[]
  goals: Goal[]
  timetable: TimetableSlot[]
  driveFiles: DriveFile[]
  trash: TrashItem[]
  archive: ArchiveItem[]
}
