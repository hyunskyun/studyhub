import type { ReactNode } from 'react'
import { cn } from './cn'

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3 md:mb-7">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Card({
  title,
  action,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <section className={cn('min-w-0 rounded-2xl border border-line bg-surface', padded && 'p-4 md:p-5', className)}>
      {(title || action) && (
        <div className={cn('mb-3 flex min-h-9 flex-wrap items-center justify-between gap-2', !padded && 'px-4 pt-4 md:px-5')}>
          {title && <h2 className="shrink-0 text-[15px] font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-6 mb-2 flex min-h-9 items-center justify-between gap-2 first:mt-0">
      <h2 className="text-sm font-semibold text-muted">{children}</h2>
      {action}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={cn('flex flex-col items-center text-center', compact ? 'py-6' : 'py-12 md:py-16')}>
      {icon && <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-subtle text-muted">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className="tabular mt-0.5 truncate text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  )
}

export function ProgressBar({
  value,
  max,
  className,
  tone = 'accent',
}: {
  value: number
  max: number
  className?: string
  tone?: 'accent' | 'success'
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('h-2 overflow-hidden rounded-full bg-subtle', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width]', tone === 'success' ? 'bg-success' : 'bg-accent')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/** UI 단계에서 아직 연결되지 않은 동작 안내. 개발 모드에서만 표시. */
export function PrototypeNotice({ children = '저장 기능은 2단계(로컬 DB)에서 연결됩니다.' }: { children?: ReactNode }) {
  if (!import.meta.env.DEV) return null
  return (
    <p className="rounded-lg border border-dashed border-line px-3 py-2 text-xs text-muted">
      <span className="font-semibold">UI 프로토타입</span> · {children}
    </p>
  )
}
