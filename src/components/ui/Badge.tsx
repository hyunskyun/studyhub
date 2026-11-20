import type { ReactNode } from 'react'
import type { ExamTag, Subject } from '../../domain/types'
import { cn } from './cn'

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const TONE: Record<Tone, string> = {
  neutral: 'bg-subtle text-muted shadow-[inset_0_0_0_1px_var(--line)]',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 rounded px-1.5 text-xs font-medium whitespace-nowrap',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function SubjectDot({ color, className }: { color?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-2 shrink-0 rounded-full', className)}
      style={{ background: color === undefined ? 'var(--faint)' : `var(--sub-${color % 6})` }}
    />
  )
}

export function SubjectLabel({ subject, fallback = '과목 없음' }: { subject?: Subject; fallback?: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted">
      <SubjectDot color={subject?.color} />
      <span className="truncate">{subject?.name ?? fallback}</span>
    </span>
  )
}

const TAG_LABEL: Record<ExamTag, string> = { suneung: '수능', naesin: '내신' }

export function TagChips({ tags }: { tags: ExamTag[] }) {
  if (tags.length === 0) return null
  return (
    <span className="inline-flex gap-1">
      {tags.map((t) => (
        <Badge key={t} className="h-[18px] px-1 text-[10.5px]">
          {TAG_LABEL[t]}
        </Badge>
      ))}
    </span>
  )
}

export function DDayBadge({ dday }: { dday: number }) {
  const tone: Tone = dday <= 1 ? 'danger' : dday <= 7 ? 'warning' : 'neutral'
  return (
    <Badge tone={tone} className="tabular">
      {dday === 0 ? 'D-Day' : dday > 0 ? `D-${dday}` : `D+${-dday}`}
    </Badge>
  )
}
