// 개발 전용 디자인 검수 fixture. 프로덕션 번들에 포함되지 않으며(동적 import + DEV 가드)
// 실제 사용자 데이터로 저장되지 않는다 (Q155).
import { DEFAULT_ERROR_CAUSES } from '../data/empty'
import type { AppRepository } from '../data/repository'
import { addDays, kstDateTime as at, mondayOf, studyDayOf, weekdayOf } from '../domain/time'
import type { AppData, Part, WorkbookUnit } from '../domain/types'

function parts(prefix: string, n: number, doneCount: number): Part[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-p${i + 1}`,
    label: `Part ${i + 1}`,
    done: i < doneCount,
  }))
}

function unit(id: string, title: string, n: number, done: number): WorkbookUnit {
  return { id, title, parts: parts(id, n, done) }
}

export function createFixtureData(now: number): AppData {
  const today = studyDayOf(now)
  const d = (n: number) => addDays(today, n)
  const mon = mondayOf(today)

  return {
    subjects: [
      { id: 'math', name: '수학', color: 0 },
      { id: 'math-calc', name: '미적분Ⅰ', parentId: 'math', color: 0 },
      { id: 'kor', name: '국어', color: 1 },
      { id: 'eng', name: '영어', color: 2 },
      { id: 'sci', name: '과학', color: 3 },
      { id: 'sci-phy', name: '물리학Ⅰ', parentId: 'sci', color: 3 },
      { id: 'hist', name: '한국사', color: 4 },
    ],
    blocks: [
      { id: 'b1', subjectId: 'math-calc', tags: ['suneung'], activity: { kind: 'workbook', id: 'wb1' }, start: at(today, '17:00'), end: at(today, '18:30') },
      { id: 'b2', subjectId: 'eng', tags: ['naesin'], start: at(today, '19:00'), end: at(today, '20:00') },
      { id: 'b3', subjectId: 'kor', tags: ['suneung', 'naesin'], start: at(today, '21:00'), end: at(today, '22:30') },
      { id: 'b4', subjectId: 'sci-phy', tags: [], start: at(today, '23:00'), end: at(d(1), '00:30') },
    ],
    events: [
      { id: 'e1', title: '진로 상담', kind: 'personal', start: at(today, '15:40'), end: at(today, '16:10') },
      { id: 'e2', title: '독서 동아리 정기 모임 (도서관 2층 세미나실)', kind: 'personal', start: at(d(2), '16:00'), end: at(d(2), '17:00'), recurrence: { weekdays: [weekdayOf(d(2))] } },
    ],
    todos: [
      {
        id: 't1', title: '물리 탐구 보고서 초안 작성', subjectId: 'sci-phy', tags: ['naesin'], priority: 'high', done: false,
        due: { date: d(1) }, partIds: [], projectStepId: 'ps2',
        subtasks: [
          { id: 't1s1', title: '실험 데이터 정리', done: true },
          { id: 't1s2', title: '그래프 작성', done: false, dueDate: today },
          { id: 't1s3', title: '결론 문단 쓰기', done: false },
        ],
      },
      { id: 't2', title: '미적분 수열의 극한 Part 4–6 풀기', subjectId: 'math-calc', tags: ['suneung'], priority: 'high', done: false, due: { date: today, time: '23:00' }, subtasks: [], partIds: ['wb1-u2-p4', 'wb1-u2-p5', 'wb1-u2-p6'] },
      { id: 't3', title: '영어 단어 Day 12 암기', subjectId: 'eng', tags: ['suneung'], priority: 'medium', done: false, due: { date: d(-1) }, subtasks: [], partIds: [] },
      { id: 't4', title: '국어 문학 작품 정리 — 현대시 「청포도」, 「광야」, 「절정」 해설 노트와 핵심 표현 비교', subjectId: 'kor', tags: ['naesin'], priority: 'medium', done: false, due: { date: d(3) }, subtasks: [{ id: 't4s1', title: '「청포도」', done: true }, { id: 't4s2', title: '「광야」', done: false }], partIds: [] },
      { id: 't5', title: '학교 도서 반납', tags: [], priority: 'low', done: false, subtasks: [], partIds: [] },
      { id: 't6', title: '한국사 3단원 요약', subjectId: 'hist', tags: ['naesin'], priority: 'low', done: true, autoCompleted: true, subtasks: [{ id: 't6s1', title: '개념 정리', done: true }], partIds: [] },
      { id: 't7', title: '수학 오답노트 정리', subjectId: 'math', tags: [], priority: 'medium', done: true, subtasks: [], partIds: [] },
    ],
    workbooks: [
      {
        id: 'wb1', title: '수학의 바이블 미적분Ⅰ', subjectId: 'math-calc',
        units: [unit('wb1-u1', '1. 함수의 극한', 6, 6), unit('wb1-u2', '2. 수열의 극한', 8, 3), unit('wb1-u3', '3. 미분법', 10, 0)],
      },
      {
        id: 'wb2', title: '수능특강 영어독해연습', subjectId: 'eng',
        units: [unit('wb2-u1', 'Part I 유형편', 12, 12), unit('wb2-u2', 'Part II 주제·소재편', 10, 4)],
      },
      {
        id: 'wb3', title: '개념완성 물리학Ⅰ', subjectId: 'sci-phy',
        units: [unit('wb3-u1', '역학과 에너지', 5, 5), unit('wb3-u2', '물질과 전자기장', 4, 4)],
      },
    ],
    sessions: [
      { id: 's1', subjectId: 'math-calc', tags: ['suneung'], start: at(today, '06:30'), end: at(today, '07:20'), breaks: [], source: 'timer' },
      { id: 's2', subjectId: 'eng', tags: ['suneung', 'naesin'], start: at(today, '13:10'), end: at(today, '14:00'), breaks: [{ start: at(today, '13:40'), end: at(today, '13:45') }], source: 'timer' },
      { id: 's3', subjectId: 'kor', tags: ['naesin'], start: at(d(-1), '20:00'), end: at(d(-1), '21:30'), breaks: [], source: 'manual' },
      { id: 's4', subjectId: 'math-calc', tags: ['suneung'], start: at(d(-2), '19:00'), end: at(d(-2), '21:00'), breaks: [{ start: at(d(-2), '20:00'), end: at(d(-2), '20:10') }], source: 'timer' },
      { id: 's5', subjectId: 'sci-phy', tags: [], start: at(d(-3), '22:00'), end: at(d(-3), '23:40'), breaks: [], source: 'timer' },
      { id: 's6', subjectId: 'eng', tags: ['suneung'], start: at(d(-4), '18:00'), end: at(d(-4), '19:10'), breaks: [], source: 'timer' },
      { id: 's7', subjectId: 'hist', tags: ['naesin'], start: at(d(-5), '21:00'), end: at(d(-5), '22:00'), breaks: [], source: 'manual' },
      { id: 's8', subjectId: 'math-calc', tags: ['suneung'], start: at(d(-6), '20:00'), end: at(d(-6), '22:30'), breaks: [], source: 'timer' },
    ],
    activeTimer: {
      subjectId: 'math-calc', tags: ['suneung'], activity: { kind: 'workbook', id: 'wb1' }, planBlockId: 'b1',
      segmentStart: new Date(now - 42 * 60_000).toISOString(), ownedHere: true,
    },
    timerConflicts: [
      { id: 'c1', subjectId: 'eng', tags: ['suneung'], start: at(today, '13:30'), end: at(today, '14:20'), breaks: [], source: 'timer' },
    ],
    mockExams: [
      {
        id: 'm1', year: 2026, month: 9, org: '평가원', subjectId: 'math', originalDate: '2026-09-03', totalQuestions: 30,
        attempts: [
          { id: 'm1a1', attemptNo: 1, solvedDate: d(-20), scores: { raw: 76, standard: 128, percentile: 88, grade: 3 }, wrong: [{ question: 14, causeId: 'cause-concept' }, { question: 21, causeId: 'cause-time' }, { question: 29, causeId: 'cause-concept' }, { question: 30, causeId: 'cause-time' }], wrongConfirmed: true },
          { id: 'm1a2', attemptNo: 2, solvedDate: d(-6), scores: { raw: 88, grade: 2 }, wrong: [{ question: 21, causeId: 'cause-calc' }, { question: 30, causeId: 'cause-concept' }], wrongConfirmed: true },
        ],
      },
      {
        id: 'm2', year: 2026, month: 10, org: '서울시교육청', subjectId: 'eng', originalDate: '2026-10-15', totalQuestions: 45,
        attempts: [{ id: 'm2a1', attemptNo: 1, solvedDate: d(-3), scores: { grade: 2 }, wrong: [{ question: 34, causeId: 'cause-read' }, { question: 37, causeId: 'cause-read' }], wrongConfirmed: false }],
      },
      {
        id: 'm3', year: 2026, month: 6, org: '평가원', subjectId: 'kor', originalDate: '2026-06-04', totalQuestions: 45,
        attempts: [{ id: 'm3a1', attemptNo: 1, solvedDate: d(-40), scores: { raw: 81, standard: 125, percentile: 84, grade: 3 }, wrong: [{ question: 12, causeId: 'cause-read' }], wrongConfirmed: true }],
      },
    ],
    errorCauses: [...DEFAULT_ERROR_CAUSES, { id: 'cause-user1', name: '선지 비교 부족', active: true }],
    schoolExams: [
      { id: 'x1', year: 2026, semester: 2, term: 'final', subjectId: 'math-calc', date: d(1), scopePartIds: ['wb1-u2-p1', 'wb1-u2-p2', 'wb1-u2-p3', 'wb1-u2-p4', 'wb1-u2-p5', 'wb1-u2-p6', 'wb1-u2-p7', 'wb1-u2-p8', 'wb1-u2-p4'] },
      { id: 'x2', year: 2026, semester: 2, term: 'final', subjectId: 'eng', date: d(4), scopePartIds: ['wb2-u2-p1', 'wb2-u2-p2', 'wb2-u2-p3', 'wb2-u2-p4', 'wb2-u2-p5'] },
      { id: 'x3', year: 2026, semester: 2, term: 'midterm', subjectId: 'math-calc', date: '2026-09-28', raw: 84, grade: 2, scopePartIds: ['wb1-u1-p1', 'wb1-u1-p2'] },
      { id: 'x4', year: 2026, semester: 1, term: 'final', subjectId: 'math-calc', date: '2026-07-06', raw: 78, grade: 3, scopePartIds: [] },
      { id: 'x5', year: 2026, semester: 1, term: 'midterm', subjectId: 'math-calc', date: '2026-04-27', raw: 71, grade: 3, scopePartIds: [] },
    ],
    projects: [
      {
        id: 'p1', subjectId: 'sci-phy', title: '물리 탐구 보고서: 자유낙하 운동의 가속도 측정', due: { date: d(1), time: '18:00' },
        criteria: '실험 설계 30 / 데이터 분석 40 / 결론 및 고찰 30', totalScore: 100, submitted: false,
        steps: [
          { id: 'ps1', title: '실험 설계', due: d(-5), done: true },
          { id: 'ps2', title: '보고서 초안', due: d(1), done: false, todoId: 't1' },
          { id: 'ps3', title: '최종 제출', due: d(1), done: false },
        ],
      },
      {
        id: 'p2', subjectId: 'kor', title: '국어 독서 발표', due: { date: d(9) }, totalScore: 20, submitted: false,
        steps: [{ id: 'ps4', title: '발표 자료 만들기', due: d(7), done: false }],
      },
      { id: 'p3', subjectId: 'eng', title: '영어 에세이', due: { date: d(-10) }, totalScore: 30, earnedScore: 27, submitted: true, steps: [] },
    ],
    academies: [{ id: 'a1', name: '한빛수학학원' }, { id: 'a2', name: '정상어학원' }],
    courses: [
      { id: 'co1', academyId: 'a1', subjectId: 'math-calc', title: '미적분 심화반', teacher: '김선생', slots: [{ weekday: 2, start: '18:00', end: '21:00' }, { weekday: 4, start: '18:00', end: '21:00' }], homeworkTemplate: ['교재 해당 단원 문제 풀이', '오답 정리', '주간 테스트 대비'] },
      { id: 'co2', academyId: 'a2', subjectId: 'eng', title: '수능 영어 독해', teacher: 'Ms. Park', slots: [{ weekday: 6, start: '10:00', end: '12:30' }], homeworkTemplate: ['단어 시험 범위 암기', '독해 지문 10개'] },
    ],
    classes: [
      { id: 'cl1', courseId: 'co1', date: d(-2), start: at(d(-2), '18:00'), end: at(d(-2), '21:00'), status: 'attended' },
      { id: 'cl2', courseId: 'co1', date: today, start: at(today, '18:00'), end: at(today, '21:00'), status: 'scheduled' },
      { id: 'cl3', courseId: 'co2', date: d(1), start: at(d(1), '10:00'), end: at(d(1), '12:30'), status: 'cancelled' },
      { id: 'cl4', courseId: 'co2', date: d(3), start: at(d(3), '14:00'), end: at(d(3), '16:30'), status: 'makeup' },
    ],
    homeworkWeeks: [
      { id: 'hw1', courseId: 'co1', weekOf: mon, due: d(2), items: [{ id: 'hw1i1', title: '교재 해당 단원 문제 풀이', done: true }, { id: 'hw1i2', title: '오답 정리 (12~18번)', done: false, overridden: true }, { id: 'hw1i3', title: '주간 테스트 대비', done: false }] },
      { id: 'hw2', courseId: 'co2', weekOf: mon, due: d(3), items: [{ id: 'hw2i1', title: '단어 시험 범위 암기', done: false }, { id: 'hw2i2', title: '독해 지문 10개', done: false }] },
    ],
    goals: [
      { id: 'g1', period: 'day', metric: 'minutes', target: 240 },
      { id: 'g2', period: 'week', metric: 'minutes', target: 1500 },
      { id: 'g3', subjectId: 'math-calc', period: 'week', metric: 'minutes', target: 480 },
      { id: 'g4', period: 'week', metric: 'parts', target: 20 },
      { id: 'g5', period: 'day', metric: 'todos', target: 3 },
    ],
    timetable: [1, 2, 3, 4, 5].flatMap((wd) =>
      Array.from({ length: 7 }, (_, i) => ({
        weekday: wd,
        period: i + 1,
        subject: ['국어', '수학', '영어', '물리학Ⅰ', '한국사', '체육', '미적분Ⅰ', '문학', '진로'][(i + wd * 2) % 9],
        start: ['08:40', '09:40', '10:40', '11:40', '13:30', '14:30', '15:30'][i],
        end: ['09:30', '10:30', '11:30', '12:30', '14:20', '15:20', '16:20'][i],
      })),
    ),
    driveFiles: [
      { id: 'f1', name: '미적분 수열의 극한 요약.pdf', mimeType: 'application/pdf', path: '내 드라이브 / 수학 / 미적분', status: 'ok', links: [{ kind: 'workbook', id: 'wb1' }] },
      { id: 'f2', name: '자유낙하 실험 데이터.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', path: '내 드라이브 / 과학 / 탐구', status: 'ok', links: [{ kind: 'project', id: 'p1' }, { kind: 'todo', id: 't1' }] },
      { id: 'f3', name: '영어 단어장 Day 1–30.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', path: '공유 문서함', status: 'inaccessible', links: [{ kind: 'todo', id: 't3' }] },
    ],
    trash: [
      { id: 'tr1', kind: 'todo', title: '화학 실험 준비물 챙기기', deletedAt: new Date(now - 3 * 86_400_000).toISOString() },
      { id: 'tr2', kind: 'project', title: '사회 모둠 발표', deletedAt: new Date(now - 26 * 86_400_000).toISOString(), relatedCount: 3 },
      { id: 'tr3', kind: 'block', title: '수학 계획 19:00–20:00', deletedAt: new Date(now - 1 * 86_400_000).toISOString() },
    ],
    archive: [
      { id: 'ar1', kind: 'workbook', title: '쎈 수학Ⅱ', label: '2026년 1학기' },
      { id: 'ar2', kind: 'schoolExam', title: '수학Ⅱ 기말고사', label: '2026년 1학기' },
    ],
  }
}

export function createFixtureRepository(now: number): AppRepository {
  return { kind: 'fixture', load: async () => createFixtureData(now) }
}
