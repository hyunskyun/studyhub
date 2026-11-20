import { useAppData } from '../../app/data-context'
import { ChipToggle, Select } from '../../components/ui/Form'
import type { ExamTag } from '../../domain/types'

export function SubjectSelect({
  id,
  value,
  onChange,
  allowNone,
  invalid,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  allowNone?: boolean
  invalid?: boolean
}) {
  const { data } = useAppData()
  const roots = data.subjects.filter((s) => !s.parentId)
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} invalid={invalid}>
      <option value="">{allowNone ? '과목 없음' : '과목 선택'}</option>
      {roots.map((r) => (
        <optgroup key={r.id} label={r.name}>
          <option value={r.id}>{r.name}</option>
          {data.subjects
            .filter((s) => s.parentId === r.id)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {r.name} › {s.name}
              </option>
            ))}
        </optgroup>
      ))}
    </Select>
  )
}

/** 수능/내신 태그: 둘 다·하나·없음 모두 가능 (Q1, Q118) */
export function TagPicker({ value, onChange }: { value: ExamTag[]; onChange: (v: ExamTag[]) => void }) {
  const toggle = (t: ExamTag) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t])
  return (
    <div className="flex gap-2" role="group" aria-label="수능/내신 태그">
      <ChipToggle selected={value.includes('suneung')} onClick={() => toggle('suneung')}>
        수능
      </ChipToggle>
      <ChipToggle selected={value.includes('naesin')} onClick={() => toggle('naesin')}>
        내신
      </ChipToggle>
    </div>
  )
}
