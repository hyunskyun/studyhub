// 도메인 규칙 테스트 (Node 내장 테스트 러너, 추가 라이브러리 없음)
// 실행: npm test   — 기능 명세 14장 필수 검증 시나리오(AT) 기준
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateBatch, type RecordDoc, type StoredDoc } from '../src/domain/collections.ts'
import {
  academyMinutesByDay,
  attemptJudgement,
  recomputeAutoComplete,
  scopeProgress,
  setTodoDoneManually,
  studyMinutesByDay,
  workbookProgress,
} from '../src/domain/logic.ts'
import { dDay, isOverdue, overlaps, splitMinutesByStudyDay, studyDayOf } from '../src/domain/time.ts'
import type { AcademyClass, MockAttempt, SchoolExam, StudySession, Todo, Workbook } from '../src/domain/types.ts'

const kst = (s: string) => `${s}:00+09:00`
const session = (id: string, start: string, end: string, extra: Partial<StudySession> = {}): StudySession => ({
  id,
  subjectId: 'math',
  tags: [],
  start: kst(start),
  end: kst(end),
  breaks: [],
  source: 'timer',
  ...extra,
})
const docs = (list: { id: string }[], deleted: string[] = []) =>
  new Map<string, StoredDoc>(list.map((d) => [d.id, { data: d as unknown as RecordDoc, deletedAt: deleted.includes(d.id) ? '2026-11-20T00:00:00Z' : null }]))

test('AT1: 02:00 KST에는 전날 학습일, 시험 D-1 → 05:00부터 D-Day', () => {
  const t = Date.parse(kst('2026-11-21T02:00'))
  assert.equal(studyDayOf(t), '2026-11-20')
  assert.equal(dDay('2026-11-21', t), 1)
  assert.equal(dDay('2026-11-21', Date.parse(kst('2026-11-21T04:59'))), 1)
  assert.equal(dDay('2026-11-21', Date.parse(kst('2026-11-21T05:00'))), 0)
})

test('AT2: 04:30~05:30 기록은 두 학습일에 30분씩, 원본 시각 유지', () => {
  const s = session('a', '2026-11-20T04:30', '2026-11-20T05:30')
  assert.deepEqual(splitMinutesByStudyDay(s.start, s.end), { '2026-11-19': 30, '2026-11-20': 30 })
  assert.equal(s.start, kst('2026-11-20T04:30'))
})

test('AT3: 19:00~19:40 기록이 있으면 19:30~20:00 기록 저장 불가 (Q84)', () => {
  const current = { blocks: docs([]), sessions: docs([session('old', '2026-11-20T19:00', '2026-11-20T19:40')]) }
  const err = validateBatch(current, { put: [{ c: 'sessions', data: session('new', '2026-11-20T19:30', '2026-11-20T20:00') as unknown as RecordDoc }] })
  assert.ok(err?.includes('겹쳐'))
  const ok = validateBatch(current, { put: [{ c: 'sessions', data: session('new', '2026-11-20T19:40', '2026-11-20T20:00') as unknown as RecordDoc }] })
  assert.equal(ok, null, '끝과 시작이 맞닿는 것은 허용')
})

test('AT4: 수학 50분 → 영어 30분 + 휴식 10분 = 자습 80분', () => {
  const math = session('m', '2026-11-20T19:00', '2026-11-20T19:50')
  const eng = session('e', '2026-11-20T19:50', '2026-11-20T20:30', {
    subjectId: 'eng',
    breaks: [{ start: kst('2026-11-20T20:00'), end: kst('2026-11-20T20:10') }],
  })
  assert.equal(studyMinutesByDay([math, eng])['2026-11-20'], 80)
  assert.equal(studyMinutesByDay([eng])['2026-11-20'], 30)
})

test('AT6: 학원 3시간은 자습과 따로 집계, 출석 확인 전에는 0', () => {
  const cls = (status: AcademyClass['status']): AcademyClass => ({
    id: 'c',
    courseId: 'co',
    date: '2026-11-20',
    start: kst('2026-11-20T18:00'),
    end: kst('2026-11-20T21:00'),
    status,
  })
  assert.equal(academyMinutesByDay([cls('attended')])['2026-11-20'], 180)
  assert.equal(academyMinutesByDay([cls('scheduled')])['2026-11-20'], undefined)
  assert.equal(studyMinutesByDay([session('s', '2026-11-20T15:00', '2026-11-20T17:00')])['2026-11-20'], 120)
})

test('AT7: 수능·내신 두 태그 세션 1시간은 전체에서 한 번만', () => {
  const s = session('s', '2026-11-20T15:00', '2026-11-20T16:00', { tags: ['suneung', 'naesin'] })
  assert.equal(studyMinutesByDay([s])['2026-11-20'], 60)
  assert.equal(studyMinutesByDay([s].filter((x) => x.tags.includes('suneung')))['2026-11-20'], 60)
  assert.equal(studyMinutesByDay([s].filter((x) => x.tags.includes('naesin')))['2026-11-20'], 60)
})

test('AT8: 하위 항목과 Part가 모두 완료돼야 자동 완료, 취소 시 자동 미완료, 직접 취소는 하위 유지', () => {
  const base: Todo = {
    id: 't',
    title: 't',
    tags: [],
    priority: 'medium',
    done: false,
    subtasks: [{ id: 's1', title: 's1', done: true }],
    partIds: ['p1'],
  }
  const partOpen = () => false
  const partDone = () => true
  assert.equal(recomputeAutoComplete(base, partOpen).done, false, 'Part가 남아 있으면 미완료')
  const auto = recomputeAutoComplete(base, partDone)
  assert.equal(auto.done, true)
  assert.equal(auto.autoCompleted, true)
  assert.equal(recomputeAutoComplete(auto, partOpen).done, false, '자동 완료 후 Part 취소 → 자동 미완료 (Q66)')
  const manualOff = setTodoDoneManually(auto, false)
  assert.equal(manualOff.subtasks[0].done, true, '직접 취소해도 하위 체크 유지 (Q67)')
  const manualOn = setTodoDoneManually({ ...base, subtasks: [{ id: 's1', title: 's1', done: false }] }, true)
  assert.equal(manualOn.subtasks[0].done, true, '상위 직접 완료 → 하위 모두 완료 (Q62)')
})

test('AT12: 오답 입력 확정 전에는 미입력 문항을 정답으로 보지 않음, 문항 수 변경 시 재계산', () => {
  const a: MockAttempt = { id: 'a', attemptNo: 1, solvedDate: '2026-11-20', scores: {}, wrong: [{ question: 3, causeId: 'c' }], wrongConfirmed: false }
  assert.equal(attemptJudgement(a, 30).correct, undefined)
  assert.equal(attemptJudgement({ ...a, wrongConfirmed: true }, 30).correct, 29)
  assert.equal(attemptJudgement({ ...a, wrongConfirmed: true }, 20).correct, 19)
  assert.equal(attemptJudgement({ ...a, wrongConfirmed: true, wrong: [{ question: 25, causeId: 'c' }] }, 20).state, 'unconfirmed', '범위 밖 번호는 확정 판정 불가')
})

test('AT13: 완료된 문제집에 새 미완료 Part가 생기면 미완료로', () => {
  const wb: Workbook = { id: 'w', title: 'w', subjectId: 's', units: [{ id: 'u', title: 'u', parts: [{ id: 'p1', label: 'Part 1', done: true }] }] }
  assert.equal(workbookProgress(wb).complete, true)
  const more = { ...wb, units: [...wb.units, { id: 'u2', title: 'u2', parts: [{ id: 'p2', label: 'Part 1', done: false }] }] }
  assert.equal(workbookProgress(more).complete, false)
})

test('시험 범위: 같은 Part가 여러 번 연결돼도 한 번만 계산 (Q31)', () => {
  const wb: Workbook = { id: 'w', title: 'w', subjectId: 's', units: [{ id: 'u', title: 'u', parts: [{ id: 'p1', label: '1', done: true }, { id: 'p2', label: '2', done: false }] }] }
  const exam: SchoolExam = { id: 'x', year: 2026, semester: 2, term: 'final', subjectId: 's', date: '2026-12-01', scopePartIds: ['p1', 'p1', 'p2'] }
  assert.deepEqual(scopeProgress(exam, [wb]), { total: 2, done: 1 })
})

test('학습 계획: 겹치면 저장 차단 (Q69), 학교 수업과는 무관, 복원 시에도 검사 (Q144)', () => {
  const block = (id: string, s: string, e: string) => ({ id, subjectId: 'm', tags: [], start: kst(s), end: kst(e) })
  const current = { blocks: docs([block('a', '2026-11-20T19:00', '2026-11-20T20:00'), block('b', '2026-11-20T19:30', '2026-11-20T20:30')], ['b']), sessions: docs([]) }
  assert.ok(validateBatch(current, { put: [{ c: 'blocks', data: block('n', '2026-11-20T19:30', '2026-11-20T21:00') }] }))
  assert.equal(validateBatch(current, { put: [{ c: 'blocks', data: block('n', '2026-11-20T20:00', '2026-11-20T21:00') }] }), null)
  assert.ok(validateBatch(current, { restore: [{ c: 'blocks', id: 'b' }] }), '겹치는 계획은 그대로 복원 불가')
  assert.equal(validateBatch(current, { restore: [{ c: 'blocks', id: 'b' }], remove: [{ c: 'blocks', id: 'a' }] }), null)
})

test('기한 초과: 날짜만 있으면 다음 날 05:00부터 (Q56–57)', () => {
  assert.equal(isOverdue({ date: '2026-11-20' }, Date.parse(kst('2026-11-21T04:59'))), false)
  assert.equal(isOverdue({ date: '2026-11-20' }, Date.parse(kst('2026-11-21T05:00'))), true)
  assert.equal(isOverdue({ date: '2026-11-20', time: '18:00' }, Date.parse(kst('2026-11-20T18:01'))), true)
  assert.equal(overlaps(kst('2026-11-20T10:00'), kst('2026-11-20T11:00'), kst('2026-11-20T11:00'), kst('2026-11-20T12:00')), false)
})
