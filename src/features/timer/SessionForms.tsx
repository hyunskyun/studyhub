import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { Button } from '../../components/ui/Button'
import { Field, Select, TextInput } from '../../components/ui/Form'
import { PrototypeNotice } from '../../components/ui/Layout'
import { Modal } from '../../components/ui/Modal'
import { findSessionConflicts } from '../../domain/logic'
import { formatDay, formatTime, kstDateOf, minutesBetween, overlaps, studyDayOf } from '../../domain/time'
import type { ExamTag, StudySession } from '../../domain/types'
import { SubjectSelect, TagPicker } from '../shared/inputs'

const toLocal = (iso: string) => `${kstDateOf(iso)}T${formatTime(iso)}`
const fromLocal = (v: string) => (v ? `${v}:00+09:00` : '')

/** 수동 기록: 시작·종료 일시 모두 필수 (Q74), 확정 기록과 겹치면 저장 불가 (Q84) */
export function ManualSessionModal({ sessions, onClose }: { sessions: StudySession[]; onClose: () => void }) {
  const { data, subjectName } = useAppData()
  const [subjectId, setSubjectId] = useState('')
  const [tags, setTags] = useState<ExamTag[]>([])
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [blockId, setBlockId] = useState('')
  const [touched, setTouched] = useState(false)

  const s = fromLocal(start)
  const e = fromLocal(end)
  const conflicts = s && e && e > s ? findSessionConflicts(sessions, { start: s, end: e }) : []
  const errors = {
    subject: !subjectId ? '과목을 선택하세요.' : undefined,
    start: !start ? '시작 일시를 입력하세요.' : undefined,
    end: !end ? '종료 일시를 입력하세요.' : s && e && Date.parse(e) <= Date.parse(s) ? '종료는 시작 이후여야 합니다.' : undefined,
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="공부 기록 직접 입력"
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={() => setTouched(true)} disabled={conflicts.length > 0}>
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="과목" required error={touched ? errors.subject : undefined}>
          {(id) => <SubjectSelect id={id} value={subjectId} onChange={setSubjectId} invalid={touched && !!errors.subject} />}
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium">수능/내신 태그 (선택)</p>
          <TagPicker value={tags} onChange={setTags} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="시작 일시" required error={touched ? errors.start : undefined}>
            {(id) => <TextInput id={id} type="datetime-local" value={start} onChange={(ev) => setStart(ev.target.value)} invalid={touched && !!errors.start} />}
          </Field>
          <Field label="종료 일시" required error={touched || (start && end) ? errors.end : undefined}>
            {(id) => <TextInput id={id} type="datetime-local" value={end} onChange={(ev) => setEnd(ev.target.value)} invalid={!!(touched || (start && end)) && !!errors.end} />}
          </Field>
        </div>
        <p className="text-xs text-muted">총 시간만 입력할 수는 없습니다. 05:00을 넘는 기록은 학습일별로 나뉘어 집계됩니다.</p>
        {s && e && !errors.end && <p className="text-sm">자습 {minutesBetween(s, e)}분 · 학습일 {formatDay(studyDayOf(s))}</p>}
        {conflicts.length > 0 && (
          <div role="alert" className="rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger">
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="size-4" /> 기존 기록과 시간이 겹쳐 저장할 수 없습니다
            </p>
            <ul className="mt-1 list-disc pl-5">
              {conflicts.map((c) => (
                <li key={c.id}>
                  {subjectName(c.subjectId)} {formatTime(c.start)}–{formatTime(c.end)}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Field label="계획 블록 연결 (선택)">
          {(id) => (
            <Select id={id} value={blockId} onChange={(ev) => setBlockId(ev.target.value)}>
              <option value="">연결 안 함</option>
              {data.blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {formatDay(studyDayOf(b.start))} {formatTime(b.start)}–{formatTime(b.end)} {subjectName(b.subjectId)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <PrototypeNotice />
      </div>
    </Modal>
  )
}

/** 충돌 편집: 어느 기록을 수정할지 선택하고 겹침이 해소되어야 확정 (Q82, Q138) */
export function ConflictResolver({ candidate, sessions, onClose }: { candidate: StudySession; sessions: StudySession[]; onClose: () => void }) {
  const { subjectName } = useAppData()
  const others = findSessionConflicts(sessions, candidate)
  const [target, setTarget] = useState<string>(candidate.id)
  const initial = Object.fromEntries([candidate, ...others].map((x) => [x.id, { start: toLocal(x.start), end: toLocal(x.end) }]))
  const [times, setTimes] = useState<Record<string, { start: string; end: string }>>(initial)

  const all = [candidate, ...others].map((x) => ({ ...x, start: fromLocal(times[x.id].start), end: fromLocal(times[x.id].end) }))
  const stillOverlaps = all.some((a) => all.some((b) => a.id !== b.id && overlaps(a.start, a.end, b.start, b.end)))

  return (
    <Modal
      open
      onClose={onClose}
      title="기록 시간 충돌 해결"
      size="lg"
      footer={
        <>
          <Button variant="ghost" className="mr-auto text-danger">
            충돌 후보 버리기
          </Button>
          <Button onClick={onClose}>나중에</Button>
          <Button variant="primary" disabled={stillOverlaps}>
            확정
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm">오프라인에서 기록된 구간이 기존 기록과 겹칩니다. 확정된 공부 기록은 서로 겹칠 수 없으므로 수정할 기록을 고르세요.</p>
        <div className="divide-y divide-line border-y border-line" role="radiogroup" aria-label="수정할 기록">
          {all.map((x) => (
            <label key={x.id} className={`block py-3 ${target === x.id ? '' : 'opacity-70'}`}>
              <span className="flex items-center gap-2">
                <input type="radio" name="target" className="size-5 accent-[var(--accent)]" checked={target === x.id} onChange={() => setTarget(x.id)} />
                <span className="font-medium">{subjectName(x.subjectId)}</span>
                <span className="text-xs text-muted">{x.id === candidate.id ? '충돌 후보(다른 기기)' : '확정된 기록'}</span>
              </span>
              <span className="mt-2 grid gap-2 sm:grid-cols-2">
                {(['start', 'end'] as const).map((k) => (
                  <TextInput
                    key={k}
                    type="datetime-local"
                    aria-label={`${subjectName(x.subjectId)} ${k === 'start' ? '시작' : '종료'}`}
                    disabled={target !== x.id}
                    value={times[x.id][k]}
                    onChange={(ev) => setTimes({ ...times, [x.id]: { ...times[x.id], [k]: ev.target.value } })}
                  />
                ))}
              </span>
            </label>
          ))}
        </div>
        <p role="status" className={`rounded-md px-3 py-2 text-sm ${stillOverlaps ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'}`}>
          {stillOverlaps ? '아직 시간이 겹칩니다. 겹침을 없애야 확정할 수 있습니다.' : '겹침이 해소되었습니다.'}
        </p>
        <PrototypeNotice />
      </div>
    </Modal>
  )
}
