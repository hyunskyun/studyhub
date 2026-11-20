import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'sm'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:opacity-90',
  secondary: 'bg-surface text-fg border border-line hover:bg-subtle',
  ghost: 'text-fg hover:bg-subtle',
  danger: 'bg-danger text-white dark:text-bg hover:opacity-90',
}

const SIZE: Record<Size, string> = {
  md: 'h-11 px-4 text-[15px] gap-2',
  sm: 'h-9 px-3 text-sm gap-1.5',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

export function Button({ variant = 'secondary', size = 'md', icon, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-45',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className,
  children,
  size = 'md',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: Size }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-subtle hover:text-fg disabled:opacity-40',
        size === 'md' ? 'size-11' : 'size-9',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
