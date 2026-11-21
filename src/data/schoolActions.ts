// 수행평가·시험·오답 원인·목표·시간표·학원 저장 동작
import { applyTemplate, hasClassInWeek, homeworkDue, newWeekItems, occurrenceId } from '../domain/academy'
import type { Batch } from '../domain/collections'
import { mondayOf, studyDayOf, type DateStr, type Due } from '../domain/time'
import type {
  AcademyClass,
  ClassStatus,
  Course,
  CourseSlot,
  ErrorCause,
  Goal,
  HomeworkWeek,
  MockExam,
  MockScores,
  Project,
  SchoolExam,
  TimetableSlot,
  Todo,
  WrongAnswer,
} from '../domain/types'
import { put, uuid, type Ctx } from './batch'
import { StoreError } from './store'

export interface ProjectInput {
  subjectId: string
  title: string
  due: Due
  criteria?: string
  totalScore?: number
  earnedScore?: number
}

export interface CourseInput {
  academyName: string
  title: string
  subjectId: string
  teacher?: string
  slots: CourseSlot[]
  homeworkTemplate: string[]
}

export function schoolActions({ run, get }: Ctx) {
  const project = (id: string) => {
    const p = get().projects.find((x) => x.id === id)
    if (!p) throw new StoreError(404, '수행평가를 찾을 수 없습니다.')
    return p
  }
  const exam = (id: string) => {
    const e = get().mockExams.find((x) => x.id === id)
    if (!e) throw new StoreError(404, '시험을 찾을 수 없습니다.')
    return e
  }

  /** 휴강 등으로 수업이 바뀐 뒤 미완료 숙제의 마감 재계산 (Q140) */
  function dueUpdates(course: Course, classes: AcademyClass[]) {
    return get()
      .homeworkWeeks.filter((w) => w.courseId === course.id && w.items.some((i) => !i.done))
      .map((w) => ({ w, due: homeworkDue(course, classes, w.weekOf) }))
      .filter(({ w, due }) => due && due !== w.due)
      .map(({ w, due }) => put('homeworkWeeks', { ...w, due: due! }))
  }

  return {
    // ───── 수행평가 (Q7, Q104–105, Q120–124, Q128) ─────
    saveProject(input: ProjectInput, id?: string) {
      const prev = id ? project(id) : undefined
      const p: Project = { id: prev?.id ?? uuid(), steps: prev?.steps ?? [], submitted: prev?.submitted ?? false, ...input }
      return run({ put: [put('projects', p)] })
    },
    /** 세부 단계 완료와 제출은 별개 (Q104) */
    setProjectSubmitted(id: string, submitted: boolean) {
      return run({ put: [put('projects', { ...project(id), submitted })] })
    },
    /** 단계 추가·수정. 연결된 할 일과 마감일 공유 (Q124) */
    saveStep(projectId: string, input: { id?: string; title: string; due?: DateStr }) {
      const p = project(projectId)
      const prev = p.steps.find((s) => s.id === input.id)
      const step = { id: prev?.id ?? uuid(), done: prev?.done ?? false, todoId: prev?.todoId, title: input.title.trim(), due: input.due || undefined }
      const steps = prev ? p.steps.map((s) => (s.id === step.id ? step : s)) : [...p.steps, step]
      const b: Batch = { put: [put('projects', { ...p, steps })] }
      const todo = step.todoId ? get().todos.find((t) => t.id === step.todoId) : undefined
      if (todo && todo.due?.date !== step.due) b.put!.push(put('todos', { ...todo, due: step.due ? { date: step.due } : undefined }))
      return run(b)
    },
    /** 단계 완료 ↔ 연결 할 일 완료 동기화 (Q120) */
    toggleStep(projectId: string, stepId: string) {
      const p = project(projectId)
      const step = p.steps.find((s) => s.id === stepId)!
      const done = !step.done
      const b: Batch = { put: [put('projects', { ...p, steps: p.steps.map((s) => (s.id === stepId ? { ...s, done } : s)) })] }
      const todo = step.todoId ? get().todos.find((t) => t.id === step.todoId) : undefined
      if (todo && todo.done !== done)
        b.put!.push(put('todos', { ...todo, done, autoCompleted: false, subtasks: done ? todo.subtasks.map((s) => ({ ...s, done: true })) : todo.subtasks }))
      return run(b)
    },
    /** 단계만 삭제하면 할 일은 남기고 연결만 해제 (Q123) */
    removeStep(projectId: string, stepId: string) {
      const p = project(projectId)
      const step = p.steps.find((s) => s.id === stepId)
      const b: Batch = { put: [put('projects', { ...p, steps: p.steps.filter((s) => s.id !== stepId) })] }
      const todo = step?.todoId ? get().todos.find((t) => t.id === step.todoId) : undefined
      if (todo) b.put!.push(put('todos', { ...todo, projectStepId: undefined }))
      return run(b)
    },
    /** 단계를 일반 할 일로 연결 (한 할 일은 한 단계에만: Q122) */
    linkStepTodo(projectId: string, stepId: string) {
      const p = project(projectId)
      const step = p.steps.find((s) => s.id === stepId)!
      if (step.todoId) return Promise.resolve()
      const todo: Todo = {
        id: uuid(),
        title: `${p.title} · ${step.title}`,
        subjectId: p.subjectId,
        tags: ['naesin'],
        priority: 'high',
        due: step.due ? { date: step.due } : undefined,
        done: step.done,
        subtasks: [],
        partIds: [],
        projectStepId: step.id,
      }
      return run({ put: [put('todos', todo), put('projects', { ...p, steps: p.steps.map((s) => (s.id === stepId ? { ...s, todoId: todo.id } : s)) })] })
    },
    /** 프로젝트 삭제: 연결된 할 일·하위 항목도 함께 휴지통 (Q128), 복원 시 함께 복구 (Q135) */
    removeProject(id: string) {
      const p = project(id)
      const stepIds = new Set(p.steps.map((s) => s.id))
      const linked = get().todos.filter((t) => t.projectStepId && stepIds.has(t.projectStepId))
      return run({
        put: linked.map((t) => put('todos', { ...t, deletedWithProject: id })),
        remove: [{ c: 'projects', id }, ...linked.map((t) => ({ c: 'todos' as const, id: t.id }))],
      })
    },

    // ───── 모의고사 (Q22–29, Q86–88, Q95, Q100, Q132, Q145) ─────
    saveMockExam(input: Omit<MockExam, 'id' | 'attempts'>, id?: string) {
      const prev = id ? exam(id) : undefined
      return run({ put: [put('mockExams', { id: prev?.id ?? uuid(), attempts: prev?.attempts ?? [], ...input })] })
    },
    removeMockExam(id: string) {
      return run({ remove: [{ c: 'mockExams', id }] })
    },
    /** 응시 회차 추가·수정. 미입력 점수는 비워 둔다 (0으로 대체하지 않음: Q86) */
    saveAttempt(examId: string, input: { id?: string; solvedDate: DateStr; scores: MockScores }) {
      const e = exam(examId)
      const prev = e.attempts.find((a) => a.id === input.id)
      const attempts = prev
        ? e.attempts.map((a) => (a.id === prev.id ? { ...a, solvedDate: input.solvedDate, scores: input.scores } : a))
        : [...e.attempts, { id: uuid(), attemptNo: Math.max(0, ...e.attempts.map((a) => a.attemptNo)) + 1, solvedDate: input.solvedDate, scores: input.scores, wrong: [], wrongConfirmed: false }]
      return run({ put: [put('mockExams', { ...e, attempts })] })
    },
    removeAttempt(examId: string, attemptId: string) {
      const e = exam(examId)
      return run({ put: [put('mockExams', { ...e, attempts: e.attempts.filter((a) => a.id !== attemptId) })] })
    },
    /** 오답 목록 즉시 저장, 별도 임시 상태 없음 (Q100). 확정은 명시적으로 (Q95) */
    setWrongAnswers(examId: string, attemptId: string, wrong: WrongAnswer[], wrongConfirmed: boolean) {
      const e = exam(examId)
      return run({ put: [put('mockExams', { ...e, attempts: e.attempts.map((a) => (a.id === attemptId ? { ...a, wrong, wrongConfirmed } : a)) })] })
    },
    /** 총 문항 수 변경: 확정 상태 유지, 판정은 다시 계산됨 (Q145) */
    setTotalQuestions(examId: string, totalQuestions?: number) {
      return run({ put: [put('mockExams', { ...exam(examId), totalQuestions })] })
    },

    // ───── 학교 지필 (Q8, Q30–31) ─────
    saveSchoolExam(input: Omit<SchoolExam, 'id'>, id?: string) {
      return run({ put: [put('schoolExams', { id: id ?? uuid(), ...input })] })
    },
    removeSchoolExam(id: string) {
      return run({ remove: [{ c: 'schoolExams', id }] })
    },

    // ───── 오답 원인 분류 (Q25): 기본 + 추가·이름 변경·비활성화, ID 유지 ─────
    saveErrorCause(input: { id?: string; name: string; active?: boolean }) {
      const prev = get().errorCauses.find((c) => c.id === input.id)
      const cause: ErrorCause = { id: prev?.id ?? uuid(), name: input.name.trim(), active: input.active ?? prev?.active ?? true }
      return run({ put: [put('errorCauses', cause)] })
    },

    // ───── 목표 (Q12, Q108, Q110–111, Q117) ─────
    saveGoal(input: Omit<Goal, 'id'>, id?: string) {
      return run({ put: [put('goals', { id: id ?? uuid(), ...input })] })
    },
    removeGoal(id: string) {
      return run({ remove: [{ c: 'goals', id }] })
    },

    // ───── 학교 시간표: 현재 1개, 저장하면 덮어씀 (Q36, Q106) ─────
    saveTimetable(slots: TimetableSlot[]) {
      const next = slots.filter((s) => s.subject.trim()).map((s) => ({ ...s, subject: s.subject.trim(), id: `${s.weekday}-${s.period}` }))
      const keep = new Set(next.map((s) => s.id))
      const drop = get()
        .timetable.filter((s) => s.id && !keep.has(s.id))
        .map((s) => ({ c: 'timetable' as const, id: s.id! }))
      return run({ put: next.map((s) => put('timetable', s)), remove: drop, purge: drop })
    },

    // ───── 학원 (Q36–42, Q107, Q129–130, Q134, Q136–137, Q140) ─────
    saveCourse(input: CourseInput, id?: string) {
      const d = get()
      const b: Batch = { put: [] }
      let academy = d.academies.find((a) => a.name === input.academyName.trim())
      if (!academy) {
        academy = { id: uuid(), name: input.academyName.trim() }
        b.put!.push(put('academies', academy))
      }
      const prev = id ? d.courses.find((c) => c.id === id) : undefined
      const course: Course = {
        id: prev?.id ?? uuid(),
        academyId: academy.id,
        subjectId: input.subjectId,
        title: input.title.trim(),
        teacher: input.teacher?.trim() || undefined,
        slots: input.slots,
        homeworkTemplate: input.homeworkTemplate.map((t) => t.trim()).filter(Boolean),
      }
      b.put!.push(put('courses', course))
      // 템플릿이 바뀌면 이번 주 이후 미완료 숙제에 반영 (Q130, Q134)
      if (prev && prev.homeworkTemplate.join('\n') !== course.homeworkTemplate.join('\n')) {
        const thisWeek = mondayOf(studyDayOf(Date.now()))
        for (const w of d.homeworkWeeks.filter((x) => x.courseId === course.id && x.weekOf >= thisWeek))
          b.put!.push(put('homeworkWeeks', applyTemplate(w, course.homeworkTemplate, uuid)))
      }
      return run(b)
    },
    /** 강좌 삭제: 강좌와 미완료 숙제만 휴지통, 완료 숙제는 강좌명과 함께 보존 (Q129, Q136) */
    removeCourse(id: string) {
      const d = get()
      const course = d.courses.find((c) => c.id === id)
      const weeks = d.homeworkWeeks.filter((w) => w.courseId === id)
      const undone = weeks.filter((w) => w.items.some((i) => !i.done))
      const done = weeks.filter((w) => !w.items.some((i) => !i.done))
      return run({
        put: done.map((w) => put('homeworkWeeks', { ...w, courseTitle: course?.title, academyName: d.academies.find((a) => a.id === course?.academyId)?.name })),
        remove: [{ c: 'courses', id }, ...undone.map((w) => ({ c: 'homeworkWeeks' as const, id: w.id }))],
      })
    },
    /** 출석·결석·휴강 기록. 출석 시 실제 시각 수정 가능 (Q41–42, Q107), 휴강 시 숙제 마감 이동 (Q140) */
    setClassStatus(occ: AcademyClass, status: ClassStatus, actual?: { start: string; end: string }) {
      const d = get()
      const record: AcademyClass = { ...occ, status, ...(actual ?? {}) }
      const course = d.courses.find((c) => c.id === occ.courseId)
      const classes = [...d.classes.filter((c) => c.id !== record.id), record]
      return run({ put: [put('classes', record), ...(course ? dueUpdates(course, classes) : [])] })
    },
    /** 보강 수업 추가 */
    addMakeup(courseId: string, date: DateStr, start: string, end: string) {
      const d = get()
      const record: AcademyClass = { id: `${occurrenceId(courseId, date, start)}_m`, courseId, date, start, end, status: 'scheduled', makeup: true }
      const course = d.courses.find((c) => c.id === courseId)
      return run({ put: [put('classes', record), ...(course ? dueUpdates(course, [...d.classes, record]) : [])] })
    },
    /** 이번 주 숙제 묶음 자동 생성: 실제 수업이 있는 강좌만 (Q37, Q137) */
    async syncHomework(weekOf: DateStr) {
      const d = get()
      const puts = d.courses
        .filter((co) => co.homeworkTemplate.length && !d.homeworkWeeks.some((w) => w.courseId === co.id && w.weekOf === weekOf) && hasClassInWeek(co, d.classes, weekOf))
        .map((co) => {
          const week: HomeworkWeek = { id: uuid(), courseId: co.id, weekOf, due: homeworkDue(co, d.classes, weekOf) ?? weekOf, items: newWeekItems(co.homeworkTemplate, uuid) }
          return put('homeworkWeeks', week)
        })
      if (puts.length) await run({ put: puts })
      return puts.length
    },
    toggleHomeworkItem(weekId: string, itemId: string) {
      const w = get().homeworkWeeks.find((x) => x.id === weekId)
      if (!w) return Promise.resolve()
      return run({ put: [put('homeworkWeeks', { ...w, items: w.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) })] })
    },
    /** 주차별 숙제 수정은 그 주에만, 템플릿은 그대로 (Q39) */
    editHomeworkItem(weekId: string, itemId: string, title: string) {
      const w = get().homeworkWeeks.find((x) => x.id === weekId)
      if (!w) return Promise.resolve()
      return run({ put: [put('homeworkWeeks', { ...w, items: w.items.map((i) => (i.id === itemId ? { ...i, title: title.trim(), overridden: true } : i)) })] })
    },
  }
}
