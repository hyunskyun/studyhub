import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
type Size = 'md' | 'sm'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg shadow-control hover:brightness-105',
  secondary: 'bg-surface text-fg shadow-control hover:bg-subtle',
  ghost: 'text-fg hover:bg-subtle',
  danger: 'bg-danger text-white shadow-control hover:brightness-105 dark:text-bg',
  link: 'text-accent hover:text-fg',
}

const SIZE: Record<Size, string> = {
  md: 'h-9 px-3.5 text-sm gap-1.5',
  sm: 'h-8 px-2.5 text-sm gap-1.5',
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
        'inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-45',
        VARIANT[variant],
        variant === 'link' ? 'h-8 px-1 text-sm gap-1' : SIZE[size],
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
        'inline-flex shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-subtle hover:text-fg disabled:opacity-40',
        size === 'md' ? 'size-9' : 'size-8',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
