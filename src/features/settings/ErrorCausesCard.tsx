import { useState } from 'react'
import { Check, Pencil, Plus, X } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useRun } from '../../app/useRun'
import { Button, IconButton } from '../../components/ui/Button'
import { cn } from '../../components/ui/cn'
import { TextInput, Toggle } from '../../components/ui/Form'
import { Card } from '../../components/ui/Layout'

/** 오답 원인 분류: 기본 제공 + 추가·이름 변경·비활성화, ID는 그대로 (Q25) */
export function ErrorCausesCard() {
  const { data, actions } = useAppData()
  const { run, pending, error } = useRun()
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState('')

  return (
    <Card title="오답 원인 분류">
      <ul className="divide-y divide-line">
        {data.errorCauses.map((c) => (
          <li key={c.id} className="flex min-h-10 items-center gap-2">
            {editing === c.id ? (
              <form
                className="flex flex-1 items-center gap-1"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (name.trim() && (await run(() => actions.saveErrorCause({ id: c.id, name })))) setEditing(null)
                }}
              >
                <TextInput aria-label="원인 이름" value={name} onChange={(e) => setName(e.target.value)} className="h-8" autoFocus />
                <IconButton size="sm" label="저장" type="submit" disabled={!name.trim() || pending}>
                  <Check className="size-4" />
                </IconButton>
                <IconButton size="sm" label="취소" onClick={() => setEditing(null)}>
                  <X className="size-4" />
                </IconButton>
              </form>
            ) : (
              <>
                <span className={cn('min-w-0 flex-1 truncate text-sm', !c.active && 'text-faint line-through')}>{c.name}</span>
                <IconButton
                  size="sm"
                  label={`${c.name} 이름 바꾸기`}
                  onClick={() => {
                    setName(c.name)
                    setEditing(c.id)
                  }}
                >
                  <Pencil className="size-3.5" />
                </IconButton>
                <div className="w-12">
                  <Toggle label={`${c.name} 사용`} checked={c.active} onChange={(v) => run(() => actions.saveErrorCause({ id: c.id, name: c.name, active: v }))} />
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (adding.trim() && (await run(() => actions.saveErrorCause({ name: adding })))) setAdding('')
        }}
      >
        <TextInput aria-label="새 원인" placeholder="새 원인 추가" value={adding} onChange={(e) => setAdding(e.target.value)} className="h-8" />
        <Button size="sm" type="submit" icon={<Plus className="size-4" />} disabled={!adding.trim() || pending}>
          추가
        </Button>
      </form>
      <p className="mt-2 text-xs text-muted">비활성화한 원인은 새 오답에 고를 수 없지만 기존 기록에는 그대로 남습니다.</p>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </Card>
  )
}
