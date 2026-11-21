import { useState } from 'react'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useRun } from '../../app/useRun'
import { Button } from '../../components/ui/Button'
import { CheckButton, Field, Segmented, TextInput } from '../../components/ui/Form'
import { Modal } from '../../components/ui/Modal'
import { studyDayOf } from '../../domain/time'
import type { MockExam, SchoolExam } from '../../domain/types'
import { SubjectSelect } from '../shared/inputs'

const int = (v: string) => (v.trim() === '' ? undefined : Number(v))
const thisYear = () => Number(studyDayOf(Date.now()).slice(0, 4))

/** 모의고사: 과목별 독립 등록, 출제 연도·월·기관·시행일 (Q22, Q29) */
export function MockExamEditor({ exam, onClose }: { exam: MockExam | null; onClose: () => void }) {
  const { actions } = useAppData()
  const { run, pending, error } = useRun()
  const [year, setYear] = useState(() => String(exam?.year ?? thisYear()))
  const [month, setMonth] = useState(String(exam?.month ?? ''))
  const [org, setOrg] = useState(exam?.org ?? '')
  const [subjectId, setSubjectId] = useState(exam?.subjectId ?? '')
  const [originalDate, setOriginalDate] = useState(exam?.originalDate ?? '')
  const [total, setTotal] = useState(exam?.totalQuestions?.toString() ?? '')
  const [touched, setTouched] = useState(false)

  const errors = {
    year: !/^\d{4}$/.test(year) ? '연도 4자리' : undefined,
    month: !(Number(month) >= 1 && Number(month) <= 12) ? '1~12월' : undefined,
    org: !org.trim() ? '기관을 입력하세요.' : undefined,
    subject: !subjectId ? '과목을 선택하세요.' : undefined,
    date: !originalDate ? '시행일을 입력하세요.' : undefined,
    total: total.trim() && !(Number.isInteger(Number(total)) && Number(total) > 0) ? '1 이상의 정수' : undefined,
  }

  const submit = async () => {
    setTouched(true)
    if (Object.values(errors).some(Boolean)) return
    const input = { year: Number(year), month: Number(month), org: org.trim(), subjectId, originalDate, totalQuestions: int(total) }
    if (await run(() => actions.saveMockExam(input, exam?.id))) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={exam ? '모의고사 수정' : '모의고사 추가'}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={submit} disabled={pending}>
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="출제 연도" required error={touched ? errors.year : undefined}>
            {(id) => <TextInput id={id} inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />}
          </Field>
          <Field label="월" required error={touched ? errors.month : undefined}>
            {(id) => <TextInput id={id} inputMode="numeric" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="예: 9" />}
          </Field>
          <Field label="기관" required error={touched ? errors.org : undefined}>
            {(id) => <TextInput id={id} value={org} onChange={(e) => setOrg(e.target.value)} placeholder="예: 평가원" />}
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="과목" required error={touched ? errors.subject : undefined}>
            {(id) => <SubjectSelect id={id} value={subjectId} onChange={setSubjectId} invalid={touched && !!errors.subject} />}
          </Field>
          <Field label="시행일" required error={touched ? errors.date : undefined}>
            {(id) => <TextInput id={id} type="date" value={originalDate} onChange={(e) => setOriginalDate(e.target.value)} />}
          </Field>
          <Field label="총 문항 수" error={touched ? errors.total : undefined}>
            {(id) => <TextInput id={id} inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} />}
          </Field>
        </div>
        {!exam && <p className="text-xs text-muted">저장한 뒤 시험 카드의 "응시 추가"로 첫 응시 회차와 점수를 입력하세요.</p>}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}

/** 응시 회차 추가 (첫 응시 / 재응시: Q22) */
export function AttemptCreate({ exam, onClose }: { exam: MockExam; onClose: () => void }) {
  const { actions } = useAppData()
  const { run, pending, error } = useRun()
  const [solvedDate, setSolvedDate] = useState(() => studyDayOf(Date.now()))
  return (
    <Modal
      open
      onClose={onClose}
      title={exam.attempts.length ? '재응시 추가' : '첫 응시 추가'}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button
            variant="primary"
            disabled={!solvedDate || pending}
            onClick={async () => {
              if (await run(() => actions.saveAttempt(exam.id, { solvedDate, scores: {} }))) onClose()
            }}
          >
            추가
          </Button>
        </>
      }
    >
      <Field label="실제 풀이일" required>
        {(id) => <TextInput id={id} type="date" value={solvedDate} onChange={(e) => setSolvedDate(e.target.value)} />}
      </Field>
      <p className="mt-2 text-xs text-muted">추가한 뒤 회차를 눌러 점수와 오답을 입력합니다.</p>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}

/** 학교 지필: 연도·학기·과목·시험일·원점수·등급, 시험 범위는 여러 교재의 Part 연결 (Q8, Q30) */
export function SchoolExamEditor({ exam, onClose }: { exam: SchoolExam | null; onClose: () => void }) {
  const { data, actions } = useAppData()
  const { run, pending, error } = useRun()
  const [year, setYear] = useState(() => String(exam?.year ?? thisYear()))
  const [semester, setSemester] = useState<'1' | '2'>(String(exam?.semester ?? 1) as '1' | '2')
  const [term, setTerm] = useState<SchoolExam['term']>(exam?.term ?? 'midterm')
  const [subjectId, setSubjectId] = useState(exam?.subjectId ?? '')
  const [date, setDate] = useState(exam?.date ?? '')
  const [raw, setRaw] = useState(exam?.raw?.toString() ?? '')
  const [grade, setGrade] = useState(exam?.grade?.toString() ?? '')
  const [scope, setScope] = useState<Set<string>>(new Set(exam?.scopePartIds ?? []))
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [touched, setTouched] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const errors = {
    year: !/^\d{4}$/.test(year) ? '연도 4자리' : undefined,
    subject: !subjectId ? '과목을 선택하세요.' : undefined,
    date: !date ? '시험일을 입력하세요.' : undefined,
    score: [raw, grade].some((v) => v.trim() && Number.isNaN(Number(v))) ? '숫자로 입력하세요.' : undefined,
  }
  const toggle = (ids: string[], on: boolean) => {
    const n = new Set(scope)
    for (const id of ids) {
      if (on) n.add(id)
      else n.delete(id)
    }
    setScope(n)
  }

  const submit = async () => {
    setTouched(true)
    if (Object.values(errors).some(Boolean)) return
    const ok = await run(() =>
      actions.saveSchoolExam({ year: Number(year), semester: Number(semester) as 1 | 2, term, subjectId, date, raw: int(raw), grade: int(grade), scopePartIds: [...scope] }, exam?.id),
    )
    if (ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={exam ? '지필 시험 수정' : '지필 시험 추가'}
      footer={
        <>
          {exam && (
            <Button variant="ghost" className="mr-auto text-danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
              휴지통으로
            </Button>
          )}
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={submit} disabled={pending}>
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="연도" required error={touched ? errors.year : undefined} className="w-24">
            {(id) => <TextInput id={id} inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />}
          </Field>
          <div>
            <p className="mb-1 text-sm font-medium">학기</p>
            <Segmented label="학기" value={semester} onChange={setSemester} options={[{ value: '1', label: '1학기' }, { value: '2', label: '2학기' }]} />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">시험</p>
            <Segmented label="시험" value={term} onChange={setTerm} options={[{ value: 'midterm', label: '중간' }, { value: 'final', label: '기말' }]} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="과목" required error={touched ? errors.subject : undefined}>
            {(id) => <SubjectSelect id={id} value={subjectId} onChange={setSubjectId} invalid={touched && !!errors.subject} />}
          </Field>
          <Field label="시험일" required error={touched ? errors.date : undefined}>
            {(id) => <TextInput id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="원점수 (선택)" error={errors.score}>
            {(id) => <TextInput id={id} inputMode="decimal" value={raw} onChange={(e) => setRaw(e.target.value)} />}
          </Field>
          <Field label="등급 (선택)">{(id) => <TextInput id={id} inputMode="numeric" value={grade} onChange={(e) => setGrade(e.target.value)} />}</Field>
        </div>

        <section>
          <p className="mb-1 text-sm font-medium">시험 범위 (문제집 Part 연결)</p>
          {data.workbooks.length === 0 ? (
            <p className="text-sm text-faint">문제집이 없습니다. 문제집을 등록하면 범위를 연결할 수 있습니다.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-line overflow-y-auto border-y border-line">
              {data.workbooks.flatMap((w) =>
                w.units.map((u) => {
                  const ids = u.parts.map((p) => p.id)
                  const n = ids.filter((id) => scope.has(id)).length
                  const key = u.id
                  return (
                    <li key={key} className="py-1">
                      <div className="flex min-h-9 items-center gap-2">
                        <CheckButton checked={n === ids.length && n > 0} indeterminate={n > 0 && n < ids.length} label={`${w.title} ${u.title} 전체`} onChange={(v) => toggle(ids, v)} />
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-1 text-left text-sm"
                          onClick={() => setOpen((s) => (s.has(key) ? new Set([...s].filter((x) => x !== key)) : new Set([...s, key])))}
                        >
                          {open.has(key) ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
                          <span className="truncate">
                            {w.title} · {u.title}
                          </span>
                        </button>
                        <span className="tabular text-xs text-muted">
                          {n}/{ids.length}
                        </span>
                      </div>
                      {open.has(key) && (
                        <div className="flex flex-wrap gap-1.5 pb-2 pl-9">
                          {u.parts.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              aria-pressed={scope.has(p.id)}
                              onClick={() => toggle([p.id], !scope.has(p.id))}
                              className={`h-8 min-w-11 rounded px-2 text-sm ${scope.has(p.id) ? 'bg-accent text-accent-fg' : 'bg-subtle shadow-[inset_0_0_0_1px_var(--line)]'}`}
                            >
                              {p.label.replace('Part ', '')}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                }),
              )}
            </ul>
          )}
          <p className="mt-1 text-xs text-muted">선택한 고유 Part가 모두 완료되어야 범위 전체 완료로 봅니다. {scope.size}개 선택됨</p>
        </section>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      {confirmDelete && exam && (
        <Modal
          open
          onClose={() => setConfirmDelete(false)}
          title="지필 시험을 휴지통으로 이동할까요?"
          footer={
            <>
              <Button onClick={() => setConfirmDelete(false)}>취소</Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (await run(() => actions.removeSchoolExam(exam.id))) onClose()
                }}
              >
                휴지통으로 이동
              </Button>
            </>
          }
        >
          <p className="text-sm">30일 안에 휴지통에서 복원할 수 있습니다. 연결된 문제집 Part는 그대로 남습니다.</p>
        </Modal>
      )}
    </Modal>
  )
}

