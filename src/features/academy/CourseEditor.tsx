import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useRun } from '../../app/useRun'
import { Button, IconButton } from '../../components/ui/Button'
import { Field, Select, TextArea, TextInput } from '../../components/ui/Form'
import { Modal } from '../../components/ui/Modal'
import type { Course, CourseSlot } from '../../domain/types'
import { SubjectSelect } from '../shared/inputs'

const WD = ['일', '월', '화', '수', '목', '금', '토']

/** 학원 강좌: 학원·강좌·과목·강사, 정기 수업 요일·시각, 주간 숙제 템플릿 (Q36–38) */
export function CourseEditor({ course, onClose }: { course: Course | null; onClose: () => void }) {
  const { data, actions } = useAppData()
  const { run, pending, error } = useRun()
  const [academyName, setAcademyName] = useState(data.academies.find((a) => a.id === course?.academyId)?.name ?? '')
  const [title, setTitle] = useState(course?.title ?? '')
  const [subjectId, setSubjectId] = useState(course?.subjectId ?? '')
  const [teacher, setTeacher] = useState(course?.teacher ?? '')
  const [slots, setSlots] = useState<CourseSlot[]>(course?.slots ?? [{ weekday: 1, start: '18:00', end: '20:00' }])
  const [template, setTemplate] = useState(course?.homeworkTemplate.join('\n') ?? '')
  const [touched, setTouched] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const errors = {
    academy: !academyName.trim() ? '학원 이름을 입력하세요.' : undefined,
    title: !title.trim() ? '강좌 이름을 입력하세요.' : undefined,
    subject: !subjectId ? '과목을 선택하세요.' : undefined,
    slots: slots.length === 0 ? '정기 수업을 하나 이상 넣으세요.' : slots.some((s) => s.end <= s.start) ? '종료 시각은 시작보다 늦어야 합니다.' : undefined,
  }

  const submit = async () => {
    setTouched(true)
    if (Object.values(errors).some(Boolean)) return
    const ok = await run(() =>
      actions.saveCourse({ academyName, title, subjectId, teacher, slots, homeworkTemplate: template.split('\n') }, course?.id),
    )
    if (ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={course ? '강좌 수정' : '강좌 추가'}
      footer={
        <>
          {course && (
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="학원" required error={touched ? errors.academy : undefined}>
            {(id) => (
              <>
                <TextInput id={id} list="academy-names" value={academyName} onChange={(e) => setAcademyName(e.target.value)} placeholder="예: 한빛수학학원" />
                <datalist id="academy-names">
                  {data.academies.map((a) => (
                    <option key={a.id} value={a.name} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field label="강좌" required error={touched ? errors.title : undefined}>
            {(id) => <TextInput id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 미적분 심화반" />}
          </Field>
          <Field label="과목" required error={touched ? errors.subject : undefined}>
            {(id) => <SubjectSelect id={id} value={subjectId} onChange={setSubjectId} invalid={touched && !!errors.subject} />}
          </Field>
          <Field label="강사 (선택)">{(id) => <TextInput id={id} value={teacher} onChange={(e) => setTeacher(e.target.value)} />}</Field>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">정기 수업</p>
          <ul className="space-y-2">
            {slots.map((s, i) => (
              <li key={i} className="grid grid-cols-[5rem_1fr_1fr_auto] items-center gap-2">
                <Select aria-label="요일" value={s.weekday} onChange={(e) => setSlots(slots.map((x, j) => (j === i ? { ...x, weekday: Number(e.target.value) } : x)))}>
                  {WD.map((w, d) => (
                    <option key={w} value={d}>
                      {w}요일
                    </option>
                  ))}
                </Select>
                <TextInput aria-label="시작" type="time" value={s.start} onChange={(e) => setSlots(slots.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
                <TextInput aria-label="종료" type="time" value={s.end} onChange={(e) => setSlots(slots.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
                <IconButton size="sm" label="이 수업 삭제" onClick={() => setSlots(slots.filter((_, j) => j !== i))}>
                  <X className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="ghost" className="mt-1" icon={<Plus className="size-4" />} onClick={() => setSlots([...slots, { weekday: 3, start: '18:00', end: '20:00' }])}>
            수업 요일 추가
          </Button>
          {touched && errors.slots && <p className="text-xs text-danger">{errors.slots}</p>}
        </div>

        <Field label="주간 숙제 템플릿 (선택)" hint="한 줄에 하나씩. 수업이 있는 주마다 이 목록으로 숙제가 만들어집니다. 바꾸면 이번 주 이후 미완료 숙제에 반영됩니다(직접 고친 항목은 유지).">
          {(id, d) => <TextArea id={id} aria-describedby={d} rows={4} value={template} onChange={(e) => setTemplate(e.target.value)} placeholder={'교재 해당 단원 풀기\n오답 정리'} />}
        </Field>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      {confirmDelete && course && (
        <Modal
          open
          onClose={() => setConfirmDelete(false)}
          title="강좌를 휴지통으로 이동할까요?"
          footer={
            <>
              <Button onClick={() => setConfirmDelete(false)}>취소</Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (await run(() => actions.removeCourse(course.id))) onClose()
                }}
              >
                휴지통으로 이동
              </Button>
            </>
          }
        >
          <p className="text-sm">강좌와 미완료 주간 숙제가 30일 휴지통으로 이동합니다. 다 끝낸 숙제 기록은 강좌 이름과 함께 남습니다.</p>
        </Modal>
      )}
    </Modal>
  )
}
