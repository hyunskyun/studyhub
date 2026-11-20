import { useState } from 'react'
import { useAppData } from '../../app/data-context'
import { useRun } from '../../app/useRun'
import { Button } from '../../components/ui/Button'
import { ChipToggle, Field, TextInput } from '../../components/ui/Form'
import { Modal } from '../../components/ui/Modal'
import { addDays, kstDateTime, type DateStr } from '../../domain/time'

/** 일정 추가: 단발 또는 주간 반복 (Q11). 학교 예외 수업도 여기서 일정으로 (Q99) */
export function EventEditor({ day, onClose }: { day: DateStr; onClose: () => void }) {
  const { actions } = useAppData()
  const { run, pending, error } = useRun()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(day)
  const [start, setStart] = useState('16:00')
  const [end, setEnd] = useState('17:00')
  const [repeatDays, setRepeatDays] = useState<number[]>([])
  const [touched, setTouched] = useState(false)

  const titleError = !title.trim() ? '제목을 입력하세요.' : undefined
  const timeError = start === end ? '시작과 종료 시각이 같습니다.' : undefined

  const submit = async () => {
    setTouched(true)
    if (titleError || timeError || !date) return
    const endDate = end <= start ? addDays(date, 1) : date // 자정을 넘기면 다음 날 종료
    const ok = await run(() =>
      actions.addEvent({ title, start: kstDateTime(date, start), end: kstDateTime(endDate, end), weekdays: repeatDays.sort() }),
    )
    if (ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="일정 추가"
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
        <Field label="제목" required error={touched ? titleError : undefined}>
          {(id) => <TextInput id={id} placeholder="예: 진로 상담" value={title} onChange={(e) => setTitle(e.target.value)} invalid={touched && !!titleError} />}
        </Field>
        <Field label="날짜" required>
          {(id) => <TextInput id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="시작" required>
            {(id) => <TextInput id={id} type="time" value={start} onChange={(e) => setStart(e.target.value)} invalid={!!timeError} />}
          </Field>
          <Field label="종료" required error={timeError}>
            {(id) => <TextInput id={id} type="time" value={end} onChange={(e) => setEnd(e.target.value)} invalid={!!timeError} />}
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">매주 반복 (선택)</p>
          <div className="flex flex-wrap gap-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((w, i) => (
              <ChipToggle key={w} selected={repeatDays.includes(i)} onClick={() => setRepeatDays((r) => (r.includes(i) ? r.filter((x) => x !== i) : [...r, i]))}>
                {w}
              </ChipToggle>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted">특정 날짜의 학교 예외 수업도 여기서 일정으로 추가합니다(정규 시간표는 바뀌지 않음).</p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
