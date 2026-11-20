import { useState } from 'react'
import { ClipboardList, Link2, Paperclip, Plus, Trash2 } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useNow } from '../../app/useNow'
import { Badge, DDayBadge, SubjectLabel } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { cn } from '../../components/ui/cn'
import { CheckButton, Toggle } from '../../components/ui/Form'
import { Card, EmptyState, PageHeader, ProgressBar, PrototypeNotice } from '../../components/ui/Layout'
import { ConfirmDialog } from '../../components/ui/Modal'
import { dDay, formatDay } from '../../domain/time'
import type { Project } from '../../domain/types'

export default function ProjectsPage() {
  const now = useNow()
  const { data, subject } = useAppData()
  const [projects, setProjects] = useState<Project[]>(data.projects)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  const update = (p: Project) => setProjects((all) => all.map((x) => (x.id === p.id ? p : x)))
  const active = projects.filter((p) => !p.submitted).sort((a, b) => a.due.date.localeCompare(b.due.date))
  const submitted = projects.filter((p) => p.submitted)

  const card = (p: Project) => {
    const done = p.steps.filter((s) => s.done).length
    const files = data.driveFiles.filter((f) => f.links.some((l) => l.kind === 'project' && l.id === p.id))
    const linkedTodos = p.steps.filter((s) => s.todoId).length
    return (
      <Card key={p.id}>
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
        </div>

        {p.criteria && <p className="mt-3 rounded-xl bg-subtle px-3 py-2 text-sm text-muted">평가 기준 · {p.criteria}</p>}

        {p.steps.length > 0 && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-sm">
              <span>세부 단계</span>
              <span className="tabular text-muted">
                {done}/{p.steps.length}
              </span>
            </div>
            <ProgressBar value={done} max={p.steps.length} />
            <ul className="mt-2">
              {p.steps.map((s) => (
                <li key={s.id} className="flex min-h-11 items-center gap-2">
                  <CheckButton
                    checked={s.done}
                    label={`${s.title} 완료`}
                    round
                    onChange={(v) => update({ ...p, steps: p.steps.map((x) => (x.id === s.id ? { ...x, done: v } : x)) })}
                  />
                  <span className={cn('min-w-0 flex-1 text-[15px]', s.done && 'text-muted line-through')}>{s.title}</span>
                  {s.todoId && (
                    <Badge>
                      <Link2 className="size-3" /> 할 일
                    </Badge>
                  )}
                  {s.due && <span className="text-xs text-muted">{formatDay(s.due)}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <Toggle label="제출 완료" description="세부 단계 완료와 별개로 기록" checked={p.submitted} onChange={(v) => update({ ...p, submitted: v })} />
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <span className="text-sm text-muted">획득 / 총점</span>
            <span className="tabular text-lg font-semibold">
              {p.earnedScore ?? '–'} / {p.totalScore ?? '–'}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {files.length > 0 && (
            <span className="flex items-center gap-1 text-sm text-muted">
              <Paperclip className="size-4" /> 자료 {files.length}
            </span>
          )}
          <span className="flex-1" />
          <Button size="sm" variant="ghost" className="text-danger" icon={<Trash2 className="size-4" />} onClick={() => setDeleteTarget(p)}>
            삭제
          </Button>
        </div>
        {linkedTodos > 0 && <p className="mt-1 text-xs text-muted">연결된 할 일과 마감일이 양방향으로 맞춰집니다.</p>}
      </Card>
    )
  }

  return (
    <>
      <PageHeader
        title="수행평가"
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />}>
            프로젝트 추가
          </Button>
        }
      />
      {projects.length === 0 ? (
        <Card>
          <EmptyState icon={<ClipboardList className="size-6" />} title="수행평가가 없습니다" description="과목·마감·배점과 세부 단계를 등록해 진행 상황을 관리합니다." />
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
          <div className="mt-4">
            <PrototypeNotice>체크·제출 상태는 화면에서만 바뀌며 저장되지 않습니다.</PrototypeNotice>
          </div>
        </>
      )}

      {/* 프로젝트 삭제 시 연결 할 일·하위 항목 함께 휴지통 (Q128) */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="수행평가를 휴지통으로 이동할까요?"
        tone="danger"
        confirmLabel="휴지통으로 이동"
        onConfirm={() => setDeleteTarget(null)}
      >
        <p>「{deleteTarget?.title}」과 연결된 할 일 {deleteTarget?.steps.filter((s) => s.todoId).length ?? 0}개(하위 항목 포함)가 함께 30일 휴지통으로 이동합니다.</p>
        <p className="text-sm text-muted">30일 안에 복원하면 연결 관계까지 함께 복구됩니다. Google Drive 원본 파일은 삭제되지 않습니다.</p>
        <PrototypeNotice />
      </ConfirmDialog>
    </>
  )
}
