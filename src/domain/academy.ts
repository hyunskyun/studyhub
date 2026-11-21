// 학원 수업 회차·주간 숙제 규칙 (순수 함수)
import { addDays, kstDateTime, mondayOf, weekdayOf, type DateStr } from './time.ts'
import type { AcademyClass, Course, HomeworkItem, HomeworkWeek } from './types.ts'

/** 정기 수업 회차 ID (요일·시각으로 결정되어 출석·휴강 기록과 연결된다) */
export function occurrenceId(courseId: string, date: DateStr, start: string) {
  return `${courseId}_${date}_${start.replace(':', '')}`
}

/**
 * 기간 [from, to] 의 수업 회차: 정기 시간(Q36) + 저장된 출석·휴강 기록 + 보강.
 * 저장된 기록이 있으면 그 상태·실제 시각을 쓴다.
 */
export function courseOccurrences(courses: Course[], classes: AcademyClass[], from: DateStr, to: DateStr): AcademyClass[] {
  const stored = new Map(classes.map((c) => [c.id, c]))
  const out: AcademyClass[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const wd = weekdayOf(d)
    for (const co of courses)
      for (const s of co.slots) {
        if (s.weekday !== wd) continue
        const id = occurrenceId(co.id, d, s.start)
        out.push(stored.get(id) ?? { id, courseId: co.id, date: d, start: kstDateTime(d, s.start), end: kstDateTime(d, s.end), status: 'scheduled' })
      }
  }
  // 보강·정기 시간 밖 기록 (강좌가 남아 있는 것만)
  const ids = new Set(out.map((o) => o.id))
  for (const c of classes)
    if (!ids.has(c.id) && c.date >= from && c.date <= to && courses.some((co) => co.id === c.courseId)) out.push(c)
  return out.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
}

/** 실제로 열리는 수업 (휴강 제외) */
export function isActual(c: AcademyClass) {
  return c.status !== 'cancelled'
}

/**
 * 주간 숙제 마감: 그 주 이후의 다음 실제 수업일 (Q37, Q40).
 * 휴강이 생기면 그다음 실제 수업일로 밀린다 (Q140). 4주 안에 없으면 undefined.
 */
export function homeworkDue(course: Course, classes: AcademyClass[], weekOf: DateStr): DateStr | undefined {
  const from = addDays(weekOf, 7)
  const next = courseOccurrences([course], classes, from, addDays(from, 27)).find(isActual)
  return next?.date
}

/** 그 주에 실제 수업이 있어야 숙제 묶음을 만든다 (Q137) */
export function hasClassInWeek(course: Course, classes: AcademyClass[], weekOf: DateStr) {
  return courseOccurrences([course], classes, weekOf, addDays(weekOf, 6)).some(isActual)
}

export function newWeekItems(template: string[], makeId: () => string): HomeworkItem[] {
  return template.map((title, i) => ({ id: makeId(), title, done: false, templateIndex: i }))
}

/**
 * 템플릿 변경을 미래 주차의 미완료 숙제에 반영 (Q130).
 * 사용자가 그 주에서 직접 고친 항목(overridden)과 완료 항목은 그대로 둔다 (Q134).
 */
export function applyTemplate(week: HomeworkWeek, template: string[], makeId: () => string): HomeworkWeek {
  const items: HomeworkItem[] = []
  for (const it of week.items) {
    if (it.done || it.overridden || it.templateIndex === undefined) items.push(it)
    else if (it.templateIndex < template.length) items.push({ ...it, title: template[it.templateIndex] })
    // 템플릿에서 빠진 줄의 미완료·미수정 항목은 제거
  }
  for (let i = 0; i < template.length; i++)
    if (!items.some((it) => it.templateIndex === i)) items.push({ id: makeId(), title: template[i], done: false, templateIndex: i })
  return { ...week, items }
}

export function weekOfDay(day: DateStr) {
  return mondayOf(day)
}
