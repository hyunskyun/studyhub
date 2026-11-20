import { useState } from 'react'
import { CheckCircle2, Plus, X } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { Badge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { cn } from '../../components/ui/cn'
import { Field, Select, TextInput } from '../../components/ui/Form'
import { PrototypeNotice } from '../../components/ui/Layout'
import { Modal } from '../../components/ui/Modal'
import { attemptJudgement } from '../../domain/logic'
import { formatDay } from '../../domain/time'
import type { MockAttempt, MockExam } from '../../domain/types'

const SCORE_FIELDS = [
  { key: 'raw', label: '원점수' },
  { key: 'standard', label: '표준점수' },
  { key: 'percentile', label: '백분위' },
  { key: 'grade', label: '등급' },
] as const

/** 응시 회차 상세: 점수 선택 입력(Q86), 오답 입력·확정(Q95, Q132, Q145), 회차 비교(Q88) */
export function AttemptModal({ exam, attempt, onClose }: { exam: MockExam; attempt: MockAttempt; onClose: () => void }) {
  const { data, subjectName } = useAppData()
  const [total, setTotal] = useState(exam.totalQuestions ? String(exam.totalQuestions) : '')
  const [wrong, setWrong] = useState(attempt.wrong)
  const [confirmed, setConfirmed] = useState(attempt.wrongConfirmed)
  const [newQ, setNewQ] = useState('')
  const [newCause, setNewCause] = useState(data.errorCauses.find((c) => c.active)?.id ?? '')

  const totalN = Number(total) || undefined
  const j = attemptJudgement({ ...attempt, wrong, wrongConfirmed: confirmed }, totalN)
  const qN = Number(newQ)
  const addError = newQ && (!Number.isInteger(qN) || qN < 1 || (totalN && qN > totalN)) ? `1~${totalN ?? '?'}번 사이의 문항 번호를 입력하세요.` : wrong.some((w) => w.question === qN) ? '이미 입력된 문항입니다.' : undefined
  const causeName = (id: string) => data.errorCauses.find((c) => c.id === id)?.name ?? '분류 없음'
  const others = exam.attempts.filter((a) => a.id !== attempt.id)
  const questions = [...new Set(exam.attempts.flatMap((a) => a.wrong.map((w) => w.question)))].sort((a, b) => a - b)

  return (
    <Modal open onClose={onClose} size="lg" title={`${exam.year}년 ${exam.month}월 ${exam.org} ${subjectName(exam.subjectId)} · ${attempt.attemptNo}회차`}>
      <div className="space-y-6">
        <section>
          <p className="mb-2 text-sm text-muted">풀이일 {formatDay(attempt.solvedDate, true)} · 시행일 {formatDay(exam.originalDate, true)}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SCORE_FIELDS.map((f) => (
              <Field key={f.key} label={f.label}>
                {(id) => <TextInput id={id} inputMode="numeric" defaultValue={attempt.scores[f.key] ?? ''} placeholder="미입력" />}
              </Field>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">입력한 항목만 저장됩니다. 비운 점수를 0으로 바꾸지 않습니다.</p>
        </section>

        <section>
          <div className="mb-2 flex flex-wrap items-end gap-3">
            <Field label="총 문항 수" className="w-32">
              {(id) => <TextInput id={id} inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} />}
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
            <ul className="divide-y divide-line rounded-md border border-line">
              {wrong
                .slice()
                .sort((a, b) => a.question - b.question)
                .map((w) => (
                  <li key={w.question} className={cn('flex min-h-10 items-center gap-3 px-3', !!totalN && w.question > totalN && 'bg-danger-soft')}>
                    <span className="tabular w-12 font-semibold">{w.question}번</span>
                    <span className="flex-1 text-sm">{causeName(w.causeId)}</span>
                    {totalN && w.question > totalN && <span className="text-xs text-danger">범위 밖</span>}
                    <IconButton label={`${w.question}번 삭제`} size="sm" onClick={() => setWrong(wrong.filter((x) => x.question !== w.question))}>
                      <X className="size-4" />
                    </IconButton>
                  </li>
                ))}
            </ul>
          )}
          <div className="mt-3 grid grid-cols-[6rem_1fr_auto] items-start gap-2">
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
            <Button
              icon={<Plus className="size-4" />}
              disabled={!newQ || !!addError}
              onClick={() => {
                setWrong([...wrong, { question: qN, causeId: newCause }])
                setNewQ('')
              }}
            >
              추가
            </Button>
          </div>
          {addError && <p className="mt-1 text-xs text-danger">{addError}</p>}
          {j.outOfRange.length > 0 && <p className="mt-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">총 문항 수를 벗어난 번호가 있습니다. 수정하기 전에는 정답 판정을 확정할 수 없습니다.</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {confirmed ? (
              <Button size="sm" onClick={() => setConfirmed(false)}>
                확정 취소
              </Button>
            ) : (
              <Button size="sm" variant="primary" disabled={!totalN || j.outOfRange.length > 0} onClick={() => setConfirmed(true)}>
                오답 입력 완료 확정
              </Button>
            )}
            <p className="text-xs text-muted">확정해야 입력하지 않은 문항을 정답으로 처리합니다.</p>
          </div>
        </section>

        {others.length > 0 && questions.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold">회차별 오답 비교</h3>
            <div className="overflow-x-auto rounded-md border border-line">
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
                        const w = (a.id === attempt.id ? wrong : a.wrong).find((x) => x.question === q)
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
        <PrototypeNotice />
      </div>
    </Modal>
  )
}
