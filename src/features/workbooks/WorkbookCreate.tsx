import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Field, Segmented, TextArea, TextInput } from '../../components/ui/Form'
import { PrototypeNotice } from '../../components/ui/Layout'
import { Modal } from '../../components/ui/Modal'
import { SubjectSelect } from '../shared/inputs'
import { parseUnits } from './parseUnits'

export function WorkbookCreate({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [mode, setMode] = useState<'paste' | 'manual'>('paste')
  const [text, setText] = useState('')
  const [touched, setTouched] = useState(false)
  const rows = parseUnits(text)
  const errors = rows.filter((r) => 'error' in r)
  const ok = rows.filter((r): r is { line: number; title: string; count: number } => 'title' in r)

  return (
    <Modal
      open
      onClose={onClose}
      title="문제집 추가"
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={() => setTouched(true)} disabled={errors.length > 0}>
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="문제집 이름" required error={touched && !title.trim() ? '이름을 입력하세요.' : undefined}>
            {(id) => <TextInput id={id} value={title} onChange={(e) => setTitle(e.target.value)} invalid={touched && !title.trim()} />}
          </Field>
          <Field label="과목" required error={touched && !subjectId ? '과목을 선택하세요.' : undefined}>
            {(id) => <SubjectSelect id={id} value={subjectId} onChange={setSubjectId} invalid={touched && !subjectId} />}
          </Field>
        </div>
        <Segmented
          label="중단원 입력 방식"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'paste', label: '목록 붙여넣기' },
            { value: 'manual', label: '하나씩 추가' },
          ]}
        />
        {mode === 'paste' ? (
          <>
            <Field label="중단원과 Part 개수" hint="한 줄에 하나씩 · 예: 2. 수열의 극한 8">
              {(id, d) => <TextArea id={id} aria-describedby={d} rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={'1. 함수의 극한 6\n2. 수열의 극한 8\n3. 미분법 10'} />}
            </Field>
            {errors.length > 0 && (
              <ul role="alert" className="space-y-0.5 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
                {errors.map((e) => (
                  <li key={e.line}>{'error' in e && e.error}</li>
                ))}
              </ul>
            )}
            {ok.length > 0 && (
              <div className="border-t border-line pt-3">
                <p className="mb-2 text-sm font-medium">
                  미리보기 · 중단원 {ok.length}개, Part {ok.reduce((s, r) => s + r.count, 0)}개
                </p>
                <ul className="space-y-1 text-sm">
                  {ok.map((r) => (
                    <li key={r.line} className="flex justify-between gap-2">
                      <span className="truncate">{r.title}</span>
                      <span className="tabular shrink-0 text-muted">Part 1–{r.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <Field label="중단원 이름">{(id) => <TextInput id={id} placeholder="예: 1. 함수의 극한" />}</Field>
            <Field label="Part 개수">{(id) => <TextInput id={id} type="number" min={1} max={200} inputMode="numeric" defaultValue={5} />}</Field>
          </div>
        )}
        <PrototypeNotice />
      </div>
    </Modal>
  )
}
