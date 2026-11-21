import { useState } from 'react'
import { CheckCircle2, Plus, Trash2, X } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useRun } from '../../app/useRun'
import { Badge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { cn } from '../../components/ui/cn'
import { Field, Select, TextInput } from '../../components/ui/Form'
import { Modal } from '../../components/ui/Modal'
import { attemptJudgement } from '../../domain/logic'
import { formatDay } from '../../domain/time'
import type { MockScores } from '../../domain/types'

const SCORE_FIELDS = [
  { key: 'raw', label: '원점수' },
  { key: 'standard', label: '표준점수' },
  { key: 'percentile', label: '백분위' },
  { key: 'grade', label: '등급' },
] as const

type ScoreKey = (typeof SCORE_FIELDS)[number]['key']

/** 응시 회차 상세: 점수 선택 입력(Q86), 오답 입력·확정(Q95, Q100, Q132, Q145), 회차 비교(Q88) */
export function AttemptModal({ examId, attemptId, onClose }: { examId: string; attemptId: string; onClose: () => void }) {
  const { data, subjectName, actions } = useAppData()
  const { run, pending, error } = useRun()
  const exam = data.mockExams.find((e) => e.id === examId)
  const attempt = exam?.attempts.find((a) => a.id === attemptId)
  const [solvedDate, setSolvedDate] = useState(attempt?.solvedDate ?? '')
  const [scores, setScores] = useState<Record<ScoreKey, string>>(() => ({
    raw: attempt?.scores.raw?.toString() ?? '',
    standard: attempt?.scores.standard?.toString() ?? '',
    percentile: attempt?.scores.percentile?.toString() ?? '',
    grade: attempt?.scores.grade?.toString() ?? '',
  }))
  const [total, setTotal] = useState(exam?.totalQuestions?.toString() ?? '')
  const [newQ, setNewQ] = useState('')
  const [newCause, setNewCause] = useState(data.errorCauses.find((c) => c.active)?.id ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!exam || !attempt) return null

  const totalN = exam.totalQuestions
  const j = attemptJudgement(attempt, totalN)
  const wrong = attempt.wrong
  const qN = Number(newQ)
  const addError =
    newQ && (!Number.isInteger(qN) || qN < 1 || (totalN && qN > totalN))
      ? `1~${totalN ?? '?'}번 사이의 문항 번호를 입력하세요.`
      : wrong.some((w) => w.question === qN)
        ? '이미 입력된 문항입니다.'
        : undefined
  const causeName = (id: string) => data.errorCauses.find((c) => c.id === id)?.name ?? '분류 없음'
  const others = exam.attempts.filter((a) => a.id !== attempt.id)
  const questions = [...new Set(exam.attempts.flatMap((a) => a.wrong.map((w) => w.question)))].sort((a, b) => a - b)
  const scoreError = SCORE_FIELDS.some((f) => scores[f.key].trim() !== '' && Number.isNaN(Number(scores[f.key]))) ? '점수는 숫자로 입력하세요.' : undefined

  const saveScores = () => {
    if (scoreError || !solvedDate) return
    const parsed: MockScores = {}
    for (const f of SCORE_FIELDS) if (scores[f.key].trim() !== '') parsed[f.key] = Number(scores[f.key])
    run(() => actions.saveAttempt(exam.id, { id: attempt.id, solvedDate, scores: parsed }))
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`${exam.year}년 ${exam.month}월 ${exam.org} ${subjectName(exam.subjectId)} · ${attempt.attemptNo === 1 ? '첫 응시' : `${attempt.attemptNo}회차`}`}
      footer={
        <>
          <Button variant="ghost" className="mr-auto text-danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
            회차 삭제
          </Button>
          <Button onClick={onClose}>닫기</Button>
        </>
      }
    >
      <div className="space-y-6">
        <section>
          <p className="mb-2 text-sm text-muted">시행일 {formatDay(exam.originalDate, true)}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Field label="풀이일" className="col-span-2 sm:col-span-1">
              {(id) => <TextInput id={id} type="date" value={solvedDate} onChange={(e) => setSolvedDate(e.target.value)} />}
            </Field>
            {SCORE_FIELDS.map((f) => (
              <Field key={f.key} label={f.label}>
                {(id) => <TextInput id={id} inputMode="decimal" value={scores[f.key]} onChange={(e) => setScores({ ...scores, [f.key]: e.target.value })} placeholder="미입력" invalid={!!scoreError} />}
              </Field>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary" onClick={saveScores} disabled={pending || !!scoreError || !solvedDate}>
              점수 저장
            </Button>
            <p className="text-xs text-muted">{scoreError ?? '입력한 항목만 저장합니다. 비운 점수를 0으로 바꾸지 않습니다.'}</p>
          </div>
        </section>

        <section>
          <div className="mb-2 flex flex-wrap items-end gap-3">
            <Field label="총 문항 수" className="w-32">
              {(id) => (
                <TextInput
                  id={id}
                  inputMode="numeric"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  onBlur={() => {
                    const n = total.trim() === '' ? undefined : Number(total)
                    if (n !== totalN && (n === undefined || (Number.isInteger(n) && n > 0))) run(() => actions.setTotalQuestions(exam.id, n))
                  }}
                />
              )}
            </Field>
            <div className="flex-1" />
            {j.state === 'confirmed' ? (
              <Badge tone="success">
                <CheckCircle2 className="size-3.5" /> 오답 입력 완료 · 정답 {j.correct}문항
              </Badge>
            ) : (
              <Badge tone="warning">오답 입력 미확정 · 나머지 문항 판정 보류</Badge>
            )}
          </div>

          <h3 className="mb-2 text-sm font-semibold">틀린 문항</h3>
          {wrong.length === 0 ? (
            <p className="text-sm text-faint">아직 입력한 오답이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {wrong
                .slice()
                .sort((a, b) => a.question - b.question)
                .map((w) => (
                  <li key={w.question} className={cn('flex min-h-10 items-center gap-3 px-1', !!totalN && w.question > totalN && 'bg-danger-soft')}>
                    <span className="tabular w-12 font-semibold">{w.question}번</span>
                    <Select
                      aria-label={`${w.question}번 원인`}
                      className="h-8 w-auto"
                      value={w.causeId}
                      onChange={(e) => run(() => actions.setWrongAnswers(exam.id, attempt.id, wrong.map((x) => (x.question === w.question ? { ...x, causeId: e.target.value } : x)), attempt.wrongConfirmed))}
                    >
                      {data.errorCauses
                        .filter((c) => c.active || c.id === w.causeId)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </Select>
                    <span className="flex-1" />
                    {!!totalN && w.question > totalN && <span className="text-xs text-danger">범위 밖</span>}
                    <IconButton
                      label={`${w.question}번 삭제`}
                      size="sm"
                      disabled={pending}
                      onClick={() => run(() => actions.setWrongAnswers(exam.id, attempt.id, wrong.filter((x) => x.question !== w.question), attempt.wrongConfirmed))}
                    >
                      <X className="size-4" />
                    </IconButton>
                  </li>
                ))}
            </ul>
          )}
          <form
            className="mt-3 grid grid-cols-[5.5rem_1fr_auto] items-start gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!newQ || addError || !newCause) return
              if (await run(() => actions.setWrongAnswers(exam.id, attempt.id, [...wrong, { question: qN, causeId: newCause }], attempt.wrongConfirmed))) setNewQ('')
            }}
          >
            <TextInput aria-label="문항 번호" inputMode="numeric" placeholder="번호" value={newQ} onChange={(e) => setNewQ(e.target.value)} invalid={!!addError} />
            <Select aria-label="원인 분류" value={newCause} onChange={(e) => setNewCause(e.target.value)}>
              {data.errorCauses
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
            <Button type="submit" icon={<Plus className="size-4" />} disabled={!newQ || !!addError || pending}>
              추가
            </Button>
          </form>
          {addError && <p className="mt-1 text-xs text-danger">{addError}</p>}
          {j.outOfRange.length > 0 && <p className="mt-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">총 문항 수를 벗어난 번호가 있습니다. 수정하기 전에는 정답 판정을 확정할 수 없습니다.</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {attempt.wrongConfirmed ? (
              <Button size="sm" onClick={() => run(() => actions.setWrongAnswers(exam.id, attempt.id, wrong, false))} disabled={pending}>
                확정 취소
              </Button>
            ) : (
              <Button size="sm" variant="primary" disabled={!totalN || j.outOfRange.length > 0 || pending} onClick={() => run(() => actions.setWrongAnswers(exam.id, attempt.id, wrong, true))}>
                오답 입력 완료 확정
              </Button>
            )}
            <p className="text-xs text-muted">오답은 입력 즉시 저장됩니다. 확정해야 입력하지 않은 문항을 정답으로 처리합니다.</p>
          </div>
        </section>

        {others.length > 0 && questions.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold">회차별 오답 비교</h3>
            <div className="overflow-x-auto border-y border-line">
              <table className="w-full text-sm">
                <thead className="bg-subtle text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">문항</th>
                    {exam.attempts.map((a) => (
                      <th key={a.id} className="px-3 py-2 text-center font-medium whitespace-nowrap">
                        {a.attemptNo}회차
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {questions.map((q) => (
                    <tr key={q}>
                      <td className="tabular px-3 py-2">{q}번</td>
                      {exam.attempts.map((a) => {
                        const w = a.wrong.find((x) => x.question === q)
                        return (
                          <td key={a.id} className="px-3 py-2 text-center">
                            {w ? <span className="text-danger">✕ {causeName(w.causeId)}</span> : a.wrongConfirmed ? <span className="text-success">○</span> : <span className="text-faint">–</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        <p className="text-xs text-muted">모의고사 기록에는 파일을 연결하지 않습니다.</p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      {confirmDelete && (
        <Modal
          open
          onClose={() => setConfirmDelete(false)}
          title="이 회차를 삭제할까요?"
          footer={
            <>
              <Button onClick={() => setConfirmDelete(false)}>취소</Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (await run(() => actions.removeAttempt(exam.id, attempt.id))) onClose()
                }}
              >
                삭제
              </Button>
            </>
          }
        >
          <p className="text-sm">이 회차의 점수와 오답 기록이 지워집니다. 시험 자체는 남습니다.</p>
        </Modal>
      )}
    </Modal>
  )
}
