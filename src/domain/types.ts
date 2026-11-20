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
}

export interface Part {
  id: ID
  label: string
  done: boolean
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
  /** 휴식 중이면 휴식 시작 시각 */
  breakStart?: string
  /** 이 기기에서 조작 가능한지 (다른 기기 소유 시 읽기 전용: Q148) */
  ownedHere: boolean
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
  start: string
  end: string
  status: ClassStatus
}

export interface HomeworkItem {
  id: ID
  title: string
  done: boolean
  /** 사용자가 이 주차에서 직접 수정한 필드는 템플릿 변경에도 보존 (Q134) */
  overridden?: boolean
}

export interface HomeworkWeek {
  id: ID
  courseId: ID
  weekOf: DateStr
  due: DateStr
  items: HomeworkItem[]
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

export interface TrashItem {
  id: ID
  kind: RecordKind
  title: string
  deletedAt: string
  /** 함께 이동된 연결 항목 수 (예: 하위 할 일) */
  relatedCount?: number
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
