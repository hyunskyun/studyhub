import type { ReactNode } from 'react'
import { cn } from './cn'

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-5">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/**
 * 패널: 흰 바탕 + 얇은 그림자. 내부 영역은 상자 대신 구분선(PanelSection, divide-*)으로 나눈다.
 * title이 있으면 헤더 행 아래에 구분선이 생긴다.
 */
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
    <section className={cn('min-w-0 rounded-lg bg-surface shadow-panel', className)}>
      {(title || action) && (
        <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2 md:px-5">
          {title && <h2 className="shrink-0 text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      <div className={cn(padded && 'p-4 md:px-5')}>{children}</div>
    </section>
  )
}

/** 패널 안의 구획. 이웃 구획과 구분선으로 나뉜다. */
export function PanelSection({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('min-w-0 p-4 md:px-5', className)}>{children}</div>
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-6 mb-2 flex min-h-8 items-center justify-between gap-2 first:mt-0">
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
    <div className={cn('flex flex-col items-center text-center', compact ? 'py-5' : 'py-10')}>
      {icon && <div className="mb-2 text-faint [&>svg]:size-5">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-0.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

/** 지표: 회색 라벨 + 강조색 숫자 (+ 비교값) */
export function Stat({ label, value, sub, extra }: { label: ReactNode; value: ReactNode; sub?: ReactNode; extra?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-sm text-muted">{label}</p>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <p className="tabular truncate text-2xl text-accent">{value}</p>
        {extra && <p className="tabular shrink-0 text-base text-muted">{extra}</p>}
      </div>
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
      className={cn('h-1.5 overflow-hidden rounded-full bg-line', className)}
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
    <p className="border-l-2 border-line pl-2.5 text-xs text-muted">
      <span className="font-semibold">UI 프로토타입</span> · {children}
    </p>
  )
}
