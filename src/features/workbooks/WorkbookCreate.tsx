import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useRun } from '../../app/useRun'
import { Button, IconButton } from '../../components/ui/Button'
import { Field, Segmented, TextArea, TextInput } from '../../components/ui/Form'
import { Modal } from '../../components/ui/Modal'
import { SubjectSelect } from '../shared/inputs'
import { parseUnits } from './parseUnits'

type UnitRow = { title: string; count: string }

function validRows(rows: UnitRow[]) {
  return rows.filter((r) => r.title.trim()).map((r) => ({ title: r.title.trim(), count: Number(r.count) }))
}

/** 문제집 추가 (workbookId 없음) 또는 중단원 추가 (workbookId 있음). 붙여넣기 일괄 생성 (Q90) */
export function WorkbookCreate({ onClose, workbookId }: { onClose: () => void; workbookId?: string }) {
  const { actions } = useAppData()
  const { run, pending, error } = useRun()
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [mode, setMode] = useState<'paste' | 'manual'>(workbookId ? 'manual' : 'paste')
  const [text, setText] = useState('')
  const [manual, setManual] = useState<UnitRow[]>([{ title: '', count: '5' }])
  const [touched, setTouched] = useState(false)

  const rows = parseUnits(text)
  const parseErrors = rows.filter((r) => 'error' in r)
  const pasted = rows.filter((r): r is { line: number; title: string; count: number } => 'title' in r)
  const units = mode === 'paste' ? pasted.map(({ title: t, count }) => ({ title: t, count })) : validRows(manual)
  const countError = units.some((u) => !Number.isInteger(u.count) || u.count < 1 || u.count > 200) ? 'Part 개수는 1~200 사이로 입력하세요.' : undefined
  const unitError = units.length === 0 ? '중단원을 하나 이상 입력하세요.' : (countError ?? (mode === 'paste' && parseErrors.length ? '형식이 맞지 않는 줄이 있습니다.' : undefined))
  const isNew = !workbookId

  const submit = async () => {
    setTouched(true)
    if ((isNew && (!title.trim() || !subjectId)) || unitError) return
    const ok = await run(async () => {
      if (isNew) await actions.createWorkbook({ title, subjectId, units })
      else for (const u of units) await actions.addUnit(workbookId, u.title, u.count)
    })
    if (ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? '문제집 추가' : '중단원 추가'}
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
        {isNew && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="문제집 이름" required error={touched && !title.trim() ? '이름을 입력하세요.' : undefined}>
              {(id) => <TextInput id={id} value={title} onChange={(e) => setTitle(e.target.value)} invalid={touched && !title.trim()} />}
            </Field>
            <Field label="과목" required error={touched && !subjectId ? '과목을 선택하세요.' : undefined}>
              {(id) => <SubjectSelect id={id} value={subjectId} onChange={setSubjectId} invalid={touched && !subjectId} />}
            </Field>
          </div>
        )}
        <Segmented
          label="중단원 입력 방식"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'paste', label: '목록 붙여넣기' },
            { value: 'manual', label: '하나씩 입력' },
          ]}
        />
        {mode === 'paste' ? (
          <>
            <Field label="중단원과 Part 개수" hint="한 줄에 하나씩 · 예: 2. 수열의 극한 8">
              {(id, d) => <TextArea id={id} aria-describedby={d} rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={'1. 함수의 극한 6\n2. 수열의 극한 8\n3. 미분법 10'} />}
            </Field>
            {parseErrors.length > 0 && (
              <ul role="alert" className="space-y-0.5 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
                {parseErrors.map((e) => (
                  <li key={e.line}>{'error' in e && e.error}</li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="space-y-2">
            {manual.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_5.5rem_auto] items-center gap-2">
                <TextInput aria-label={`중단원 ${i + 1} 이름`} placeholder="예: 1. 함수의 극한" value={r.title} onChange={(e) => setManual(manual.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <TextInput aria-label={`중단원 ${i + 1} Part 개수`} type="number" min={1} max={200} inputMode="numeric" value={r.count} onChange={(e) => setManual(manual.map((x, j) => (j === i ? { ...x, count: e.target.value } : x)))} />
                <IconButton size="sm" label="이 줄 삭제" disabled={manual.length === 1} onClick={() => setManual(manual.filter((_, j) => j !== i))}>
                  <X className="size-4" />
                </IconButton>
              </div>
            ))}
            <Button size="sm" variant="ghost" icon={<Plus className="size-4" />} onClick={() => setManual([...manual, { title: '', count: '5' }])}>
              중단원 줄 추가
            </Button>
          </div>
        )}
        {units.length > 0 && !countError && (
          <div className="border-t border-line pt-3">
            <p className="mb-2 text-sm font-medium">
              미리보기 · 중단원 {units.length}개, Part {units.reduce((s, r) => s + r.count, 0)}개
            </p>
            <ul className="space-y-1 text-sm">
              {units.map((r, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">{r.title}</span>
                  <span className="tabular shrink-0 text-muted">Part 1–{r.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {touched && unitError && <p className="text-sm text-danger">{unitError}</p>}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
