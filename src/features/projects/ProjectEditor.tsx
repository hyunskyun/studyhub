import { useState } from 'react'
import { useAppData } from '../../app/data-context'
import { useRun } from '../../app/useRun'
import { Button } from '../../components/ui/Button'
import { Field, TextArea, TextInput } from '../../components/ui/Form'
import { Modal } from '../../components/ui/Modal'
import type { Project } from '../../domain/types'
import { SubjectSelect } from '../shared/inputs'

const num = (v: string) => (v.trim() === '' ? undefined : Number(v))

/** 수행평가 추가·수정: 과목, 제목, 마감, 평가 기준 설명, 총점·획득 점수 (Q7, Q105) */
export function ProjectEditor({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const { actions } = useAppData()
  const { run, pending, error } = useRun()
  const [title, setTitle] = useState(project?.title ?? '')
  const [subjectId, setSubjectId] = useState(project?.subjectId ?? '')
  const [dueDate, setDueDate] = useState(project?.due.date ?? '')
  const [dueTime, setDueTime] = useState(project?.due.time ?? '')
  const [criteria, setCriteria] = useState(project?.criteria ?? '')
  const [total, setTotal] = useState(project?.totalScore?.toString() ?? '')
  const [earned, setEarned] = useState(project?.earnedScore?.toString() ?? '')
  const [touched, setTouched] = useState(false)

  const errors = {
    title: !title.trim() ? '제목을 입력하세요.' : undefined,
    subject: !subjectId ? '과목을 선택하세요.' : undefined,
    due: !dueDate ? '마감일을 입력하세요.' : undefined,
    score:
      [total, earned].some((v) => v.trim() !== '' && (Number.isNaN(Number(v)) || Number(v) < 0))
        ? '점수는 0 이상의 숫자로 입력하세요.'
        : num(earned) !== undefined && num(total) !== undefined && num(earned)! > num(total)!
          ? '획득 점수가 총점보다 큽니다.'
          : undefined,
  }

  const submit = async () => {
    setTouched(true)
    if (Object.values(errors).some(Boolean)) return
    const ok = await run(() =>
      actions.saveProject(
        {
          title: title.trim(),
          subjectId,
          due: { date: dueDate, time: dueTime || undefined },
          criteria: criteria.trim() || undefined,
          totalScore: num(total),
          earnedScore: num(earned),
        },
        project?.id,
      ),
    )
    if (ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={project ? '수행평가 수정' : '수행평가 추가'}
      size="lg"
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
        <Field label="제목" required error={touched ? errors.title : undefined}>
          {(id) => <TextInput id={id} value={title} onChange={(e) => setTitle(e.target.value)} invalid={touched && !!errors.title} placeholder="예: 물리 탐구 보고서" />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="과목" required error={touched ? errors.subject : undefined}>
            {(id) => <SubjectSelect id={id} value={subjectId} onChange={setSubjectId} invalid={touched && !!errors.subject} />}
          </Field>
          <Field label="마감일" required error={touched ? errors.due : undefined}>
            {(id) => <TextInput id={id} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} invalid={touched && !!errors.due} />}
          </Field>
          <Field label="마감 시각 (선택)">{(id) => <TextInput id={id} type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />}</Field>
        </div>
        <Field label="배점·평가 기준 (선택)" hint="기준별 점수 입력은 없고 설명만 기록합니다.">
          {(id, d) => <TextArea id={id} aria-describedby={d} rows={3} value={criteria} onChange={(e) => setCriteria(e.target.value)} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="총점 (선택)" error={errors.score}>
            {(id) => <TextInput id={id} inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} invalid={!!errors.score} />}
          </Field>
          <Field label="획득 점수 (선택)">{(id) => <TextInput id={id} inputMode="decimal" value={earned} onChange={(e) => setEarned(e.target.value)} invalid={!!errors.score} />}</Field>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
