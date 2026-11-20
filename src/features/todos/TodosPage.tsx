import { useState } from 'react'
import { BookOpen, CheckSquare, ChevronDown, ChevronRight, Link2, Plus } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useNow } from '../../app/useNow'
import { Badge, SubjectLabel, TagChips } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { cn } from '../../components/ui/cn'
import { CheckButton, Segmented } from '../../components/ui/Form'
import { Card, EmptyState, PageHeader, PrototypeNotice } from '../../components/ui/Layout'
import { Modal } from '../../components/ui/Modal'
import { partIndex, PRIORITY_LABEL, recomputeAutoComplete, setTodoDoneManually, sortTodos, todoOverdue, todoProgress } from '../../domain/logic'
import { formatDay, studyDayOf } from '../../domain/time'
import type { Todo } from '../../domain/types'
import { TodoEditor } from './TodoEditor'

type Filter = 'all' | 'today' | 'overdue' | 'nodue'

export default function TodosPage() {
  const now = useNow()
  const { data, subject } = useAppData()
  // UI 프로토타입: 체크 상태는 화면 안에서만 바뀐다
  const [todos, setTodos] = useState<Todo[]>(data.todos)
  const [partDone, setPartDone] = useState(() => {
    const idx = partIndex(data.workbooks)
    return new Set([...idx].filter(([, p]) => p.done).map(([id]) => id))
  })
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showDone, setShowDone] = useState(false) // 완료 항목 접힌 영역 (Q115)
  const [editor, setEditor] = useState<{ todo: Todo | null } | null>(null)
  const [partConfirm, setPartConfirm] = useState<Todo | null>(null)

  const today = studyDayOf(now)
  const parts = partIndex(data.workbooks)
  const isPartDone = (id: string) => partDone.has(id)

  const update = (t: Todo) => setTodos((all) => all.map((x) => (x.id === t.id ? t : x)))

  const toggleParent = (t: Todo) => {
    if (!t.done && t.partIds.some((id) => !isPartDone(id))) return setPartConfirm(t) // Q33
    update(setTodoDoneManually(t, !t.done))
  }

  const toggleSub = (t: Todo, subId: string) => {
    const next = { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)) }
    update(recomputeAutoComplete(next, isPartDone))
  }

  const togglePart = (t: Todo, partId: string) => {
    const nextSet = new Set(partDone)
    if (nextSet.has(partId)) nextSet.delete(partId)
    else nextSet.add(partId)
    setPartDone(nextSet)
    update(recomputeAutoComplete(t, (id) => nextSet.has(id)))
  }

  const match = (t: Todo) =>
    filter === 'all' ||
    (filter === 'today' && (t.due?.date === today || t.subtasks.some((s) => s.dueDate === today))) ||
    (filter === 'overdue' && todoOverdue(t, now)) ||
    (filter === 'nodue' && !t.due)

  const open = sortTodos(todos.filter((t) => !t.done && match(t)))
  const done = todos.filter((t) => t.done && match(t))

  const row = (t: Todo) => {
    const { total, done: d } = todoProgress(t, isPartDone)
    const isOpen = expanded.has(t.id) || t.subtasks.some((s) => !s.done && s.dueDate === today) // 오늘 마감 하위 항목은 펼쳐 표시 (Q64)
    const hasChildren = t.subtasks.length + t.partIds.length > 0
    return (
      <li key={t.id} className="py-1">
        <div className="flex items-start gap-3 py-1.5">
          <div className="pt-0.5">
            <CheckButton checked={t.done} indeterminate={!t.done && d > 0} onChange={() => toggleParent(t)} label={`${t.title} 완료`} />
          </div>
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditor({ todo: t })}>
            <span className={cn('block text-[15px] leading-snug', t.done && 'text-muted line-through')}>{t.title}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              {t.subjectId && <SubjectLabel subject={subject(t.subjectId)} />}
              <TagChips tags={t.tags} />
              {t.due && <span className={cn('text-xs', todoOverdue(t, now) ? 'font-medium text-danger' : 'text-muted')}>{formatDay(t.due.date)}{t.due.time ? ` ${t.due.time}` : ''}</span>}
              {todoOverdue(t, now) && <Badge tone="danger">기한 초과</Badge>}
              {t.projectStepId && (
                <Badge>
                  <Link2 className="size-3" /> 수행평가
                </Badge>
              )}
              {total > 0 && <span className="tabular text-xs text-muted">{d}/{total}</span>}
              {t.autoCompleted && t.done && <span className="text-xs text-muted">자동 완료</span>}
            </span>
          </button>
          <Badge tone={t.priority === 'high' ? 'accent' : 'neutral'} className="mt-2">
            {PRIORITY_LABEL[t.priority]}
          </Badge>
          {hasChildren && (
            <IconButton
              label={isOpen ? '하위 항목 접기' : '하위 항목 펼치기'}
              size="sm"
              className="mt-1"
              onClick={() =>
                setExpanded((s) => {
                  const n = new Set(s)
                  if (n.has(t.id)) n.delete(t.id)
                  else n.add(t.id)
                  return n
                })
              }
            >
              {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </IconButton>
          )}
        </div>
        {hasChildren && isOpen && (
          <ul className="mb-2 ml-9 space-y-0.5 border-l border-line pl-3">
            {t.subtasks.map((s) => (
              <li key={s.id} className="flex min-h-10 items-center gap-2">
                <CheckButton checked={s.done} onChange={() => toggleSub(t, s.id)} label={`${s.title} 완료`} round />
                <span className={cn('min-w-0 flex-1 text-sm', s.done && 'text-muted line-through')}>{s.title}</span>
                {s.dueDate && <span className={cn('text-xs', s.dueDate === today ? 'font-medium text-warning' : 'text-muted')}>{s.dueDate === today ? '오늘 마감' : formatDay(s.dueDate)}</span>}
              </li>
            ))}
            {t.partIds.map((pid) => {
              const p = parts.get(pid)
              return (
                <li key={pid} className="flex min-h-10 items-center gap-2">
                  <CheckButton checked={isPartDone(pid)} onChange={() => togglePart(t, pid)} label={`${p?.label ?? 'Part'} 완료`} round />
                  <BookOpen className="size-3.5 shrink-0 text-faint" />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {p ? `${p.workbook} · ${p.unit} · ${p.label}` : '삭제된 Part'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </li>
    )
  }

  return (
    <>
      <PageHeader
        title="할 일"
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditor({ todo: null })}>
            할 일 추가
          </Button>
        }
      />
      <Segmented
        className="mb-4"
        label="필터"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: '전체' },
          { value: 'today', label: '오늘 마감' },
          { value: 'overdue', label: '기한 초과' },
          { value: 'nodue', label: '마감 없음' },
        ]}
      />

      <Card padded={false} className="px-4 py-2 md:px-5">
        {open.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="size-6" />}
            title={todos.length === 0 ? '할 일이 없습니다' : '조건에 맞는 할 일이 없습니다'}
            description={todos.length === 0 ? '마감일 없이도 추가할 수 있습니다.' : undefined}
            action={
              todos.length === 0 && (
                <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditor({ todo: null })}>
                  할 일 추가
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">{open.map(row)}</ul>
        )}
      </Card>

      {done.length > 0 && (
        <div className="mt-4">
          <button type="button" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)} className="flex h-11 items-center gap-1 text-sm font-medium text-muted">
            {showDone ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            완료됨 {done.length}
          </button>
          {showDone && (
            <Card padded={false} className="px-4 py-2 md:px-5">
              <ul className="divide-y divide-line">{done.map(row)}</ul>
            </Card>
          )}
        </div>
      )}
      <div className="mt-4">
        <PrototypeNotice>체크 상태와 자동 완료 규칙은 화면에서 시연되며 저장되지 않습니다.</PrototypeNotice>
      </div>

      {editor && <TodoEditor key={editor.todo?.id ?? 'new'} todo={editor.todo} onClose={() => setEditor(null)} />}

      {/* 연결 Part가 남은 상태에서 상위 수동 완료 (Q33) */}
      <Modal
        open={!!partConfirm}
        onClose={() => setPartConfirm(null)}
        title="연결된 Part가 남아 있습니다"
        footer={
          <>
            <Button
              onClick={() => {
                if (partConfirm) update(setTodoDoneManually(partConfirm, true))
                setPartConfirm(null)
              }}
            >
              할 일만 완료
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (partConfirm) {
                  setPartDone(new Set([...partDone, ...partConfirm.partIds]))
                  update(setTodoDoneManually(partConfirm, true))
                }
                setPartConfirm(null)
              }}
            >
              남은 Part까지 완료
            </Button>
          </>
        }
      >
        <p className="text-[15px]">
          「{partConfirm?.title}」에 연결된 문제집 Part 중 {partConfirm?.partIds.filter((id) => !isPartDone(id)).length}개가 아직 미완료입니다. 완료 범위를 선택하세요.
        </p>
      </Modal>
    </>
  )
}
