import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useRun } from '../../app/useRun'
import { Button } from '../../components/ui/Button'
import { Field, Segmented, TextInput } from '../../components/ui/Form'
import { Modal } from '../../components/ui/Modal'
import type { Goal, GoalMetric, GoalPeriod } from '../../domain/types'
import { SubjectSelect } from '../shared/inputs'

/** 목표: 일간·주간·월간 × 자습 시간·완료 Part 수·완료 할 일 수, 전체/과목별 독립 (Q12, Q110, Q117) */
export function GoalEditor({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { actions } = useAppData()
  const { run, pending, error } = useRun()
  const [period, setPeriod] = useState<GoalPeriod>(goal?.period ?? 'day')
  const [metric, setMetric] = useState<GoalMetric>(goal?.metric ?? 'minutes')
  const [subjectId, setSubjectId] = useState(goal?.subjectId ?? '')
  const [hours, setHours] = useState(goal && goal.metric === 'minutes' ? String(Math.floor(goal.target / 60)) : '')
  const [minutes, setMinutes] = useState(goal && goal.metric === 'minutes' ? String(goal.target % 60) : '')
  const [count, setCount] = useState(goal && goal.metric !== 'minutes' ? String(goal.target) : '')

  const target = metric === 'minutes' ? (Number(hours) || 0) * 60 + (Number(minutes) || 0) : Number(count)
  const invalid = !Number.isFinite(target) || target <= 0 || (metric !== 'minutes' && !Number.isInteger(target))

  const submit = async () => {
    if (invalid) return
    if (await run(() => actions.saveGoal({ period, metric, target, subjectId: subjectId || undefined }, goal?.id))) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={goal ? '목표 수정' : '목표 추가'}
      footer={
        <>
          {goal && (
            <Button
              variant="ghost"
              className="mr-auto text-danger"
              icon={<Trash2 className="size-4" />}
              onClick={async () => {
                if (await run(() => actions.removeGoal(goal.id))) onClose()
              }}
            >
              삭제
            </Button>
          )}
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={submit} disabled={pending || invalid}>
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-sm font-medium">기간</p>
          <Segmented label="기간" value={period} onChange={setPeriod} options={[{ value: 'day', label: '일간' }, { value: 'week', label: '주간' }, { value: 'month', label: '월간' }]} />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">종류</p>
          <Segmented label="종류" value={metric} onChange={setMetric} options={[{ value: 'minutes', label: '자습 시간' }, { value: 'parts', label: '완료 Part 수' }, { value: 'todos', label: '완료 할 일 수' }]} />
        </div>
        <Field label="과목 (선택)" hint="비우면 전체 목표. 전체 목표와 과목 목표는 따로 계산됩니다.">
          {(id) => <SubjectSelect id={id} value={subjectId} onChange={setSubjectId} allowNone />}
        </Field>
        {metric === 'minutes' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="시간">{(id) => <TextInput id={id} inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} />}</Field>
            <Field label="분">{(id) => <TextInput id={id} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />}</Field>
          </div>
        ) : (
          <Field label="개수">{(id) => <TextInput id={id} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />}</Field>
        )}
        <p className="text-xs text-muted">시간 목표에는 자습만 들어가고 학원 수업은 제외됩니다. 목표값을 바꾸면 지난 기간 달성률도 새 값으로 다시 계산됩니다.</p>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  )
}
