import { useState } from 'react'
import { Play, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Field, TextInput } from '../../components/ui/Form'
import { Modal } from '../../components/ui/Modal'
import { PrototypeNotice } from '../../components/ui/Layout'
import { formatTime, kstDateOf, kstDateTime, overlaps, type DateStr } from '../../domain/time'
import type { ExamTag, TimeBlock } from '../../domain/types'
import { SubjectSelect, TagPicker } from '../shared/inputs'

interface Draft {
  subjectId: string
  tags: ExamTag[]
  date: DateStr
  start: string
  end: string
}

function toDraft(b: TimeBlock | null, day: DateStr): Draft {
  if (!b) return { subjectId: '', tags: [], date: day, start: '19:00', end: '20:00' }
  return { subjectId: b.subjectId, tags: b.tags, date: kstDateOf(b.start), start: formatTime(b.start), end: formatTime(b.end) }
}

/** 학습 계획 블록 추가·수정: 날짜·시간 직접 입력 (Q68), 계획끼리 겹치면 저장 차단 (Q69) */
export function BlockEditor({
  open,
  block,
  day,
  others,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  block: TimeBlock | null
  day: DateStr
  others: TimeBlock[]
  onClose: () => void
  onSave: (b: TimeBlock) => void
  onDelete: (b: TimeBlock) => void
}) {
  const [d, setD] = useState<Draft>(() => toDraft(block, day))
  const [touched, setTouched] = useState(false)

  const startIso = kstDateTime(d.date, d.start)
  // 종료가 시작보다 이르면 다음 날로 해석 (자정 넘김)
  const endDate = d.end <= d.start ? new Date(Date.parse(`${d.date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10) : d.date
  const endIso = kstDateTime(endDate, d.end)
  const clash = others.find((o) => o.id !== block?.id && overlaps(o.start, o.end, startIso, endIso))

  const errors = {
    subject: !d.subjectId ? '과목을 선택하세요.' : undefined,
    time: d.start === d.end ? '시작과 종료 시각이 같습니다.' : clash ? `다른 학습 계획(${formatTime(clash.start)}–${formatTime(clash.end)})과 겹쳐 저장할 수 없습니다.` : undefined,
  }
  const valid = !errors.subject && !errors.time

  const submit = () => {
    setTouched(true)
    if (!valid) return
    onSave({ id: block?.id ?? `local-${Date.now()}`, subjectId: d.subjectId, tags: d.tags, start: startIso, end: endIso, activity: block?.activity })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={block ? '학습 계획 수정' : '학습 계획 추가'}
      footer={
        <>
          {block && (
            <Button variant="ghost" className="mr-auto text-danger" icon={<Trash2 className="size-4" />} onClick={() => onDelete(block)}>
              휴지통으로
            </Button>
          )}
          {block && (
            <a href="#/timer" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line px-4 text-[15px] font-medium hover:bg-subtle">
              <Play className="size-4" /> 공부 시작
            </a>
          )}
          <Button variant="primary" onClick={submit}>
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="과목" required error={touched ? errors.subject : undefined}>
          {(id) => <SubjectSelect id={id} value={d.subjectId} onChange={(v) => setD({ ...d, subjectId: v })} invalid={touched && !!errors.subject} />}
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium">수능/내신 태그 (선택)</p>
          <TagPicker value={d.tags} onChange={(tags) => setD({ ...d, tags })} />
        </div>
        <Field label="날짜" required>
          {(id) => <TextInput id={id} type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="시작" required>
            {(id) => <TextInput id={id} type="time" step={600} value={d.start} onChange={(e) => setD({ ...d, start: e.target.value })} invalid={!!errors.time} />}
          </Field>
          <Field label="종료" required>
            {(id) => <TextInput id={id} type="time" step={600} value={d.end} onChange={(e) => setD({ ...d, end: e.target.value })} invalid={!!errors.time} />}
          </Field>
        </div>
        {errors.time && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {errors.time}
          </p>
        )}
        <p className="text-xs text-muted">학교·학원 수업과 겹치는 계획은 허용됩니다. 계획을 바꿔도 이미 기록된 실제 공부 시각은 바뀌지 않습니다.</p>
        <PrototypeNotice>변경 내용은 이 화면에서만 보이며 저장되지 않습니다.</PrototypeNotice>
      </div>
    </Modal>
  )
}
