// 학원 숙제·목표 집계 규칙 테스트 — 명세 AT9·AT10, Q12·Q70·Q137·Q140
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyTemplate, courseOccurrences, hasClassInWeek, homeworkDue, occurrenceId } from '../src/domain/academy.ts'
import { goalValue } from '../src/domain/logic.ts'
import { kstDateTime } from '../src/domain/time.ts'
import type { AcademyClass, AppData, Course, HomeworkWeek } from '../src/domain/types.ts'

// 2026-11-16 은 월요일
const course: Course = { id: 'co', academyId: 'a', subjectId: 'math', title: '미적분', slots: [{ weekday: 2, start: '18:00', end: '21:00' }], homeworkTemplate: ['A', 'B'] }
const cancelled = (date: string): AcademyClass => ({
  id: occurrenceId('co', date, '18:00'),
  courseId: 'co',
  date,
  start: kstDateTime(date, '18:00'),
  end: kstDateTime(date, '21:00'),
  status: 'cancelled',
})

test('정기 수업 회차: 요일·시각으로 생성되고 저장된 휴강이 덮어씀', () => {
  const occ = courseOccurrences([course], [cancelled('2026-11-17')], '2026-11-16', '2026-11-29')
  assert.equal(occ.length, 2)
  assert.equal(occ[0].status, 'cancelled')
  assert.equal(occ[1].status, 'scheduled')
})

test('AT10: 수업이 없는(모두 휴강) 주에는 숙제 묶음을 만들지 않음 (Q137)', () => {
  assert.equal(hasClassInWeek(course, [], '2026-11-16'), true)
  assert.equal(hasClassInWeek(course, [cancelled('2026-11-17')], '2026-11-16'), false)
})

test('AT10: 숙제 마감은 다음 실제 수업일, 휴강이면 그다음으로 밀림 (Q37, Q140)', () => {
  assert.equal(homeworkDue(course, [], '2026-11-16'), '2026-11-24')
  assert.equal(homeworkDue(course, [cancelled('2026-11-24')], '2026-11-16'), '2026-12-01')
})

test('AT9: 템플릿 변경 시 미래 미완료 항목만 갱신, 직접 고친 항목·완료 항목은 유지 (Q130, Q134)', () => {
  let n = 0
  const id = () => `new${++n}`
  const week: HomeworkWeek = {
    id: 'w',
    courseId: 'co',
    weekOf: '2026-11-23',
    due: '2026-12-01',
    items: [
      { id: 'i0', title: 'A', done: false, templateIndex: 0 },
      { id: 'i1', title: 'B (12~18번만)', done: false, templateIndex: 1, overridden: true },
      { id: 'i2', title: 'C', done: true, templateIndex: 2 },
    ],
  }
  const next = applyTemplate(week, ['A2', 'B2', 'C2', 'D'], id)
  assert.equal(next.items.find((i) => i.id === 'i0')?.title, 'A2')
  assert.equal(next.items.find((i) => i.id === 'i1')?.title, 'B (12~18번만)')
  assert.equal(next.items.find((i) => i.id === 'i2')?.title, 'C')
  assert.ok(next.items.some((i) => i.title === 'D' && i.templateIndex === 3))
})

test('목표: 시간 목표는 자습만, 수량 목표는 완료 학습일로 집계 (Q12, Q70)', () => {
  const data = {
    subjects: [{ id: 'math', name: '수학', color: 0 }, { id: 'calc', name: '미적분', parentId: 'math', color: 0 }],
    sessions: [{ id: 's', subjectId: 'calc', tags: [], start: kstDateTime('2026-11-20', '19:00'), end: kstDateTime('2026-11-20', '20:00'), breaks: [], source: 'timer' }],
    classes: [{ id: 'c', courseId: 'co', date: '2026-11-20', start: kstDateTime('2026-11-20', '15:00'), end: kstDateTime('2026-11-20', '18:00'), status: 'attended' }],
    todos: [
      { id: 't1', title: '', tags: [], priority: 'low', done: true, completedDay: '2026-11-20', subtasks: [], partIds: [], subjectId: 'math' },
      { id: 't2', title: '', tags: [], priority: 'low', done: true, completedDay: '2026-11-19', subtasks: [], partIds: [] },
    ],
    workbooks: [{ id: 'w', title: '', subjectId: 'calc', units: [{ id: 'u', title: '', parts: [{ id: 'p', label: '1', done: true, doneDay: '2026-11-20' }] }] }],
  } as unknown as AppData
  assert.equal(goalValue({ id: 'g', period: 'day', metric: 'minutes', target: 60 }, data, '2026-11-20'), 60, '학원 3시간은 제외')
  assert.equal(goalValue({ id: 'g', period: 'day', metric: 'minutes', target: 60, subjectId: 'math' }, data, '2026-11-20'), 60, '세부 과목 포함')
  assert.equal(goalValue({ id: 'g', period: 'day', metric: 'todos', target: 3 }, data, '2026-11-20'), 1)
  assert.equal(goalValue({ id: 'g', period: 'week', metric: 'todos', target: 3 }, data, '2026-11-20'), 2)
  assert.equal(goalValue({ id: 'g', period: 'month', metric: 'parts', target: 3 }, data, '2026-11-20'), 1)
})
