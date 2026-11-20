import { useState } from 'react'
import { ArrowLeft, BookOpen, CheckCheck, Lock, Paperclip, Plus, Undo2 } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { Badge, SubjectLabel } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { cn } from '../../components/ui/cn'
import { Card, EmptyState, PageHeader, ProgressBar, PrototypeNotice } from '../../components/ui/Layout'
import { workbookProgress } from '../../domain/logic'
import type { Workbook } from '../../domain/types'
import { WorkbookCreate } from './WorkbookCreate'

export default function WorkbooksPage() {
  const { data, subject } = useAppData()
  // UI 프로토타입: Part 체크는 화면 상태에서만
  const [books, setBooks] = useState<Workbook[]>(data.workbooks)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)

  // 다른 기록(할 일·시험 범위)에 연결된 Part는 삭제 금지 (Q94)
  const linked = new Set([...data.todos.flatMap((t) => t.partIds), ...data.schoolExams.flatMap((e) => e.scopePartIds)])
  const selected = books.find((b) => b.id === selectedId)

  const setParts = (ids: Set<string>, done: boolean) =>
    setBooks((all) =>
      all.map((b) => ({ ...b, units: b.units.map((u) => ({ ...u, parts: u.parts.map((p) => (ids.has(p.id) ? { ...p, done } : p)) })) })),
    )

  const list = (
    <div className="divide-y divide-line overflow-hidden rounded-lg bg-surface shadow-panel">
      {books.map((b) => {
        const p = workbookProgress(b)
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              setSelectedId(b.id)
              setSelecting(false)
              setPicked(new Set())
            }}
            className={cn('block w-full border-l-2 px-4 py-3 text-left transition-colors', selectedId === b.id ? 'border-accent bg-accent-soft/40' : 'border-transparent hover:bg-subtle')}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block truncate font-medium">{b.title}</span>
                <SubjectLabel subject={subject(b.subjectId)} />
              </span>
              {p.complete ? <Badge tone="success">완료</Badge> : <span className="tabular text-sm text-muted">{Math.round((p.done / Math.max(1, p.total)) * 100)}%</span>}
            </span>
            <ProgressBar className="mt-2" value={p.done} max={p.total} tone={p.complete ? 'success' : 'accent'} />
            <span className="tabular mt-1.5 block text-xs text-muted">
              Part {p.done}/{p.total} · 중단원 {b.units.length}개
            </span>
          </button>
        )
      })}
    </div>
  )

  const detail = selected && (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" className="lg:hidden" icon={<ArrowLeft className="size-4" />} onClick={() => setSelectedId(null)}>
          목록
        </Button>
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{selected.title}</h2>
        <Button size="sm" variant={selecting ? 'primary' : 'secondary'} onClick={() => { setSelecting(!selecting); setPicked(new Set()) }}>
          {selecting ? '선택 끝' : '여러 개 선택'}
        </Button>
        <Button size="sm" icon={<Plus className="size-4" />}>
          중단원
        </Button>
      </div>
      {data.driveFiles.some((f) => f.links.some((l) => l.kind === 'workbook' && l.id === selected.id)) && (
        <p className="mb-3 flex items-center gap-1.5 text-sm text-muted">
          <Paperclip className="size-4" /> 연결된 학습 자료 {data.driveFiles.filter((f) => f.links.some((l) => l.kind === 'workbook' && l.id === selected.id)).length}개
        </p>
      )}
      <div className="divide-y divide-line rounded-lg bg-surface shadow-panel">
        {selected.units.map((u) => {
          const done = u.parts.filter((p) => p.done).length
          const all = new Set(u.parts.map((p) => p.id))
          return (
            <div key={u.id} className="p-4 md:px-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 font-medium">{u.title}</p>
                <span className="tabular text-sm text-muted">
                  {done}/{u.parts.length}
                </span>
                {done === u.parts.length ? (
                  <Button size="sm" variant="ghost" icon={<Undo2 className="size-4" />} onClick={() => setParts(all, false)}>
                    전체 취소
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" icon={<CheckCheck className="size-4" />} onClick={() => setParts(all, true)}>
                    전체 완료
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1.5">
                {u.parts.map((p) => {
                  const isPicked = picked.has(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={selecting ? isPicked : p.done}
                      onClick={() => {
                        if (selecting) {
                          const n = new Set(picked)
                          if (isPicked) n.delete(p.id)
                          else n.add(p.id)
                          setPicked(n)
                        } else setParts(new Set([p.id]), !p.done)
                      }}
                      className={cn(
                        'tabular relative flex h-9 items-center justify-center rounded text-sm transition-colors',
                        p.done ? 'bg-accent font-medium text-accent-fg' : 'bg-subtle text-fg shadow-[inset_0_0_0_1px_var(--line)] hover:bg-line/60',
                        selecting && isPicked && 'ring-2 ring-fg ring-offset-1 ring-offset-surface',
                      )}
                    >
                      {p.label.replace('Part ', '')}
                      {linked.has(p.id) && <Lock aria-label="다른 기록에 연결됨" className="absolute top-0.5 right-0.5 size-2.5 opacity-60" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      {selecting && (
        <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-surface p-2.5 pl-4 shadow-xl ring-1 ring-line md:bottom-4">
          <span className="flex-1 text-sm">{picked.size}개 선택</span>
          <Button size="sm" disabled={!picked.size} onClick={() => setParts(picked, false)}>
            완료 취소
          </Button>
          <Button size="sm" variant="primary" disabled={!picked.size} onClick={() => setParts(picked, true)}>
            완료
          </Button>
        </div>
      )}
      <p className="mt-3 flex items-center gap-1 text-xs text-muted">
        <Lock className="size-3" /> 표시된 Part는 할 일·시험 범위에 연결되어 있어 삭제할 수 없습니다.
      </p>
      <div className="mt-3">
        <PrototypeNotice>Part 체크는 화면에서만 바뀌며 저장되지 않습니다.</PrototypeNotice>
      </div>
    </div>
  )

  return (
    <>
      <PageHeader
        title="문제집"
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>
            문제집 추가
          </Button>
        }
      />
      {books.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen className="size-6" />}
            title="등록된 문제집이 없습니다"
            description="중단원과 Part 개수 목록을 붙여넣으면 한 번에 만들 수 있습니다."
            action={
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>
                문제집 추가
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className={cn(selected && 'hidden lg:block')}>{list}</div>
          <div className={cn(!selected && 'hidden lg:block')}>
            {detail ?? (
              <Card>
                <EmptyState compact title="문제집을 선택하세요" description="Part를 눌러 완료를 체크합니다." />
              </Card>
            )}
          </div>
        </div>
      )}
      {createOpen && <WorkbookCreate onClose={() => setCreateOpen(false)} />}
    </>
  )
}
