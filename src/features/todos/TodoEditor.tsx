import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button, IconButton } from '../../components/ui/Button'
import { Field, Segmented, TextInput } from '../../components/ui/Form'
import { PrototypeNotice } from '../../components/ui/Layout'
import { Modal } from '../../components/ui/Modal'
import type { ExamTag, Priority, Todo } from '../../domain/types'
import { SubjectSelect, TagPicker } from '../shared/inputs'

/** 일반 할 일 추가·수정. 반복 생성 없음(Q59), 마감일 선택(Q146), 하위 항목 1단계(Q60) */
export function TodoEditor({ todo, onClose }: { todo: Todo | null; onClose: () => void }) {
  const [title, setTitle] = useState(todo?.title ?? '')
  const [subjectId, setSubjectId] = useState(todo?.subjectId ?? '')
  const [tags, setTags] = useState<ExamTag[]>(todo?.tags ?? [])
  const [priority, setPriority] = useState<Priority>(todo?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(todo?.due?.date ?? '')
  const [dueTime, setDueTime] = useState(todo?.due?.time ?? '')
  const [subs, setSubs] = useState(todo?.subtasks.map((s) => ({ title: s.title, dueDate: s.dueDate ?? '' })) ?? [])
  const [touched, setTouched] = useState(false)

  const titleError = !title.trim() ? '제목을 입력하세요.' : undefined
  const timeError = dueTime && !dueDate ? '마감 시각을 넣으려면 마감일도 입력하세요.' : undefined
  // 상위 마감이 하위 마감보다 빨라도 경고 후 저장 허용 (Q149)
  const lateSub = dueDate ? subs.find((s) => s.dueDate && s.dueDate > dueDate) : undefined

  return (
    <Modal
      open
      onClose={onClose}
      title={todo ? '할 일 수정' : '할 일 추가'}
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={() => setTouched(true)} disabled={touched && (!!titleError || !!timeError)}>
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="제목" required error={touched ? titleError : undefined}>
          {(id, d) => <TextInput id={id} aria-describedby={d} value={title} onChange={(e) => setTitle(e.target.value)} invalid={touched && !!titleError} placeholder="예: 영어 단어 Day 12 암기" />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="과목 (선택)">{(id) => <SubjectSelect id={id} value={subjectId} onChange={setSubjectId} allowNone />}</Field>
          <div>
            <p className="mb-1.5 text-sm font-medium">수능/내신 태그 (선택)</p>
            <TagPicker value={tags} onChange={setTags} />
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">우선순위</p>
          <Segmented
            label="우선순위"
            value={priority}
            onChange={setPriority}
            options={[
              { value: 'high', label: '높음' },
              { value: 'medium', label: '보통' },
              { value: 'low', label: '낮음' },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="마감일 (선택)" hint="날짜만 넣으면 다음 날 05:00부터 기한 초과">
            {(id, d) => <TextInput id={id} aria-describedby={d} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
          </Field>
          <Field label="마감 시각 (선택)" error={timeError}>
            {(id, d) => <TextInput id={id} aria-describedby={d} type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} invalid={!!timeError} />}
          </Field>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-sm font-medium">하위 체크리스트 (선택)</p>
            <Button size="sm" variant="ghost" icon={<Plus className="size-4" />} onClick={() => setSubs([...subs, { title: '', dueDate: '' }])}>
              추가
            </Button>
          </div>
          {subs.length === 0 ? (
            <p className="text-sm text-faint">하위 항목이 없습니다. 하위 항목은 상위 우선순위를 따릅니다.</p>
          ) : (
            <ul className="space-y-2">
              {subs.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <TextInput aria-label={`하위 항목 ${i + 1}`} value={s.title} onChange={(e) => setSubs(subs.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="하위 항목" />
                  <TextInput aria-label={`하위 항목 ${i + 1} 마감일`} type="date" className="w-40 shrink-0" value={s.dueDate} onChange={(e) => setSubs(subs.map((x, j) => (j === i ? { ...x, dueDate: e.target.value } : x)))} />
                  <IconButton label="하위 항목 삭제" onClick={() => setSubs(subs.filter((_, j) => j !== i))}>
                    <X className="size-4" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
          {lateSub && <p className="mt-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">상위 마감일이 하위 항목 「{lateSub.title || '제목 없음'}」의 마감일보다 빠릅니다. 그대로 저장할 수 있습니다.</p>}
        </div>
        <PrototypeNotice />
      </div>
    </Modal>
  )
}
