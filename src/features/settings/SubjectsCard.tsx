import { useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useRun } from '../../app/useRun'
import { SubjectDot } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { Select, TextInput } from '../../components/ui/Form'
import { Card, EmptyState } from '../../components/ui/Layout'
import type { Subject } from '../../domain/types'

function Row({ s, child }: { s: Subject; child?: boolean }) {
  const { actions } = useAppData()
  const { run, pending, error } = useRun()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(s.name)

  return (
    <li className={child ? 'pl-5' : ''}>
      <div className="flex min-h-10 items-center gap-2">
        {child ? <span className="text-faint">└</span> : <SubjectDot color={s.color} />}
        {editing ? (
          <>
            <TextInput aria-label="과목 이름" value={name} onChange={(e) => setName(e.target.value)} className="h-8" autoFocus />
            <IconButton
              size="sm"
              label="이름 저장"
              disabled={!name.trim() || pending}
              onClick={async () => {
                if (await run(() => actions.renameSubject(s.id, name))) setEditing(false)
              }}
            >
              <Check className="size-4" />
            </IconButton>
            <IconButton size="sm" label="취소" onClick={() => (setEditing(false), setName(s.name))}>
              <X className="size-4" />
            </IconButton>
          </>
        ) : (
          <>
            <span className={`min-w-0 flex-1 truncate ${child ? 'text-sm' : 'font-medium'}`}>{s.name}</span>
            <IconButton size="sm" label={`${s.name} 이름 바꾸기`} onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" />
            </IconButton>
            <IconButton size="sm" label={`${s.name} 삭제`} disabled={pending} onClick={() => run(() => actions.removeSubject(s.id))}>
              <Trash2 className="size-3.5" />
            </IconButton>
          </>
        )}
      </div>
      {error && <p className="pb-1 text-xs text-danger">{error}</p>}
    </li>
  )
}

/** 과목 계층: 대분류 → 세부 과목 (Q2). 이름 변경 시 ID 유지 (Q125), 삭제는 휴지통 (Q126) */
export function SubjectsCard() {
  const { data, actions } = useAppData()
  const { run, pending, error } = useRun()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const roots = data.subjects.filter((s) => !s.parentId)

  const submit = async () => {
    if (!name.trim()) return
    if (await run(() => actions.addSubject(name, parentId || undefined))) {
      setName('')
    }
  }

  return (
    <Card
      title="과목"
      action={
        !adding && (
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
            추가
          </Button>
        )
      }
    >
      {adding && (
        <form
          className="mb-3 flex flex-wrap items-center gap-2 border-b border-line pb-3"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <TextInput aria-label="새 과목 이름" placeholder="예: 수학, 미적분Ⅰ" value={name} onChange={(e) => setName(e.target.value)} className="min-w-40 flex-1" autoFocus />
          <Select aria-label="상위 과목" value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-auto">
            <option value="">대분류로 추가</option>
            {roots.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}의 세부 과목
              </option>
            ))}
          </Select>
          <Button type="submit" variant="primary" disabled={!name.trim() || pending}>
            추가
          </Button>
          <Button onClick={() => setAdding(false)}>닫기</Button>
          {error && <p className="w-full text-xs text-danger">{error}</p>}
        </form>
      )}
      {data.subjects.length === 0 ? (
        <EmptyState compact title="과목이 없습니다" description="대분류(예: 수학) 아래에 세부 과목(예: 미적분Ⅰ)을 둘 수 있습니다." />
      ) : (
        <ul className="divide-y divide-line">
          {roots.map((r) => (
            <li key={r.id}>
              <ul>
                <Row s={r} />
                {data.subjects
                  .filter((s) => s.parentId === r.id)
                  .map((s) => (
                    <Row key={s.id} s={s} child />
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
