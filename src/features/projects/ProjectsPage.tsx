import { useState } from 'react'
import { Check, ClipboardList, Link2, Paperclip, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useNow } from '../../app/useNow'
import { useRun } from '../../app/useRun'
import { Badge, DDayBadge, SubjectLabel } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { cn } from '../../components/ui/cn'
import { CheckButton, TextInput, Toggle } from '../../components/ui/Form'
import { Card, EmptyState, PageHeader, ProgressBar } from '../../components/ui/Layout'
import { ConfirmDialog } from '../../components/ui/Modal'
import { dDay, formatDay } from '../../domain/time'
import type { Project, ProjectStep } from '../../domain/types'
import { ProjectEditor } from './ProjectEditor'

function StepForm({ initial, onSave, onCancel }: { initial?: ProjectStep; onSave: (v: { title: string; due?: string }) => Promise<boolean>; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [due, setDue] = useState(initial?.due ?? '')
  return (
    <form
      className="flex flex-wrap items-center gap-2 py-1.5"
      onSubmit={async (e) => {
        e.preventDefault()
        if (title.trim() && (await onSave({ title, due: due || undefined }))) onCancel()
      }}
    >
      <TextInput aria-label="단계 이름" placeholder="예: 보고서 초안" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 min-w-36 flex-1" autoFocus />
      <TextInput aria-label="단계 기한" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-8 w-38" />
      <IconButton size="sm" label="단계 저장" type="submit" disabled={!title.trim()}>
        <Check className="size-4" />
      </IconButton>
      <IconButton size="sm" label="취소" onClick={onCancel}>
        <X className="size-4" />
      </IconButton>
    </form>
  )
}

function ProjectCard({ p, onEdit, onDelete }: { p: Project; onEdit: () => void; onDelete: () => void }) {
  const now = useNow()
  const { data, subject, actions } = useAppData()
  const { run, pending, error } = useRun()
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const done = p.steps.filter((s) => s.done).length
  const files = data.driveFiles.filter((f) => f.links.some((l) => l.kind === 'project' && l.id === p.id))

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{p.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <SubjectLabel subject={subject(p.subjectId)} />
            <span className="text-sm text-muted">
              마감 {formatDay(p.due.date)}
              {p.due.time ? ` ${p.due.time}` : ''}
            </span>
          </div>
        </div>
        {p.submitted ? <Badge tone="success">제출함</Badge> : <DDayBadge dday={dDay(p.due.date, now)} />}
        <IconButton size="sm" label="수행평가 수정" onClick={onEdit}>
          <Pencil className="size-3.5" />
        </IconButton>
      </div>

      {p.criteria && <p className="mt-2 text-sm whitespace-pre-line text-muted">평가 기준 · {p.criteria}</p>}

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span>세부 단계</span>
          <span className="tabular text-muted">
            {done}/{p.steps.length}
          </span>
        </div>
        {p.steps.length > 0 && <ProgressBar value={done} max={p.steps.length} />}
        <ul className="mt-1 divide-y divide-line">
          {p.steps.map((s) =>
            editing === s.id ? (
              <li key={s.id}>
                <StepForm initial={s} onSave={(v) => run(() => actions.saveStep(p.id, { id: s.id, ...v }))} onCancel={() => setEditing(null)} />
              </li>
            ) : (
              <li key={s.id} className="flex min-h-10 items-center gap-2">
                <CheckButton checked={s.done} label={`${s.title} 완료`} round disabled={pending} onChange={() => run(() => actions.toggleStep(p.id, s.id))} />
                <span className={cn('min-w-0 flex-1 text-sm', s.done && 'text-muted line-through')}>{s.title}</span>
                {s.due && <span className="text-xs text-muted">{formatDay(s.due)}</span>}
                {s.todoId ? (
                  <Badge>
                    <Link2 className="size-3" /> 할 일
                  </Badge>
                ) : (
                  <Button size="sm" variant="link" onClick={() => run(() => actions.linkStepTodo(p.id, s.id))} disabled={pending}>
                    할 일로
                  </Button>
                )}
                <IconButton size="sm" label={`${s.title} 수정`} onClick={() => setEditing(s.id)}>
                  <Pencil className="size-3.5" />
                </IconButton>
                <IconButton size="sm" label={`${s.title} 삭제`} disabled={pending} onClick={() => run(() => actions.removeStep(p.id, s.id))}>
                  <X className="size-3.5" />
                </IconButton>
              </li>
            ),
          )}
        </ul>
        {editing === 'new' ? (
          <StepForm onSave={(v) => run(() => actions.saveStep(p.id, v))} onCancel={() => setEditing(null)} />
        ) : (
          <Button size="sm" variant="ghost" className="mt-1" icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
            단계 추가
          </Button>
        )}
      </div>

      <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
        <Toggle label="제출 완료" description="세부 단계 완료와 별개로 기록" checked={p.submitted} onChange={(v) => run(() => actions.setProjectSubmitted(p.id, v))} />
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="text-sm text-muted">획득 / 총점</span>
          <span className="tabular text-base font-semibold">
            {p.earnedScore ?? '–'} / {p.totalScore ?? '–'}
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {files.length > 0 && (
          <span className="flex items-center gap-1 text-sm text-muted">
            <Paperclip className="size-4" /> 자료 {files.length}
          </span>
        )}
        {p.steps.some((s) => s.todoId) && <span className="text-xs text-muted">연결된 할 일과 완료·마감일이 함께 맞춰집니다.</span>}
        <span className="flex-1" />
        <Button size="sm" variant="ghost" className="text-danger" icon={<Trash2 className="size-4" />} onClick={onDelete}>
          삭제
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </Card>
  )
}

export default function ProjectsPage() {
  const { data, actions } = useAppData()
  const { run, error } = useRun()
  const [editor, setEditor] = useState<{ project: Project | null } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  const active = data.projects.filter((p) => !p.submitted).sort((a, b) => a.due.date.localeCompare(b.due.date))
  const submitted = data.projects.filter((p) => p.submitted)
  const card = (p: Project) => <ProjectCard key={p.id} p={p} onEdit={() => setEditor({ project: p })} onDelete={() => setDeleteTarget(p)} />
  const linkedCount = (p: Project) => data.todos.filter((t) => t.projectStepId && p.steps.some((s) => s.id === t.projectStepId)).length

  return (
    <>
      <PageHeader
        title="수행평가"
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditor({ project: null })}>
            수행평가 추가
          </Button>
        }
      />
      {error && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {error}
        </p>
      )}
      {data.projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="size-6" />}
            title="수행평가가 없습니다"
            description="과목·마감·배점과 세부 단계를 등록해 진행 상황을 관리합니다."
            action={
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditor({ project: null })}>
                수행평가 추가
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">{active.map(card)}</div>
          {submitted.length > 0 && (
            <>
              <h2 className="mt-8 mb-3 text-sm font-semibold text-muted">제출함</h2>
              <div className="grid gap-4 lg:grid-cols-2">{submitted.map(card)}</div>
            </>
          )}
        </>
      )}

      {editor && <ProjectEditor key={editor.project?.id ?? 'new'} project={editor.project} onClose={() => setEditor(null)} />}

      {/* 프로젝트 삭제 시 연결 할 일·하위 항목 함께 휴지통 (Q128) */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="수행평가를 휴지통으로 이동할까요?"
        tone="danger"
        confirmLabel="휴지통으로 이동"
        onConfirm={() => {
          if (deleteTarget) run(() => actions.removeProject(deleteTarget.id))
          setDeleteTarget(null)
        }}
      >
        <p>
          「{deleteTarget?.title}」과 연결된 할 일 {deleteTarget ? linkedCount(deleteTarget) : 0}개(하위 항목 포함)가 함께 30일 휴지통으로 이동합니다.
        </p>
        <p className="text-sm text-muted">30일 안에 복원하면 연결 관계까지 함께 복구됩니다. Google Drive 원본 파일은 삭제되지 않습니다.</p>
      </ConfirmDialog>
    </>
  )
}
