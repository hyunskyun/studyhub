import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from './cn'

const CONTROL =
  'w-full rounded-md border bg-surface px-2.5 text-sm text-fg shadow-[0_1px_1px_rgb(0_0_0/0.03)] placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-3 focus:ring-accent/15'

export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: (id: string, describedBy?: string) => ReactNode
  className?: string
}) {
  const id = useId()
  const msgId = `${id}-msg`
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children(id, error || hint ? msgId : undefined)}
      {error ? (
        <p id={msgId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function TextInput({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, 'h-9', invalid ? 'border-danger' : 'border-line', className)}
      {...rest}
    />
  )
}

export function TextArea({ invalid, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, 'min-h-20 py-2', invalid ? 'border-danger' : 'border-line', className)}
      {...rest}
    />
  )
}

export function Select({ invalid, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, 'h-9 appearance-auto', invalid ? 'border-danger' : 'border-line', className)}
      {...rest}
    >
      {children}
    </select>
  )
}

/** 체크 버튼: 보이는 크기 18px, 터치 영역 36px. indeterminate = 부분 완료 */
export function CheckButton({
  checked,
  indeterminate,
  onChange,
  label,
  round,
  disabled,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: (next: boolean) => void
  label: string
  round?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group -m-[9px] inline-flex size-9 shrink-0 items-center justify-center disabled:opacity-40"
    >
      <span
        className={cn(
          'flex size-[18px] items-center justify-center border-[1.5px] transition-colors',
          round ? 'rounded-full' : 'rounded-[5px]',
          checked ? 'border-accent bg-accent text-accent-fg' : indeterminate ? 'border-accent text-accent' : 'border-faint/70 bg-surface group-hover:border-muted',
        )}
      >
        {checked ? <Check className="size-3" strokeWidth={3.5} /> : indeterminate ? <Minus className="size-3" strokeWidth={3.5} /> : null}
      </span>
    </button>
  )
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-line')}
      >
        <span className={cn('absolute top-0.5 left-0 size-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4.5' : 'translate-x-0.5')} />
      </button>
    </label>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
  className?: string
}) {
  return (
    <div role="tablist" aria-label={label} className={cn('inline-flex max-w-full overflow-x-auto rounded-md bg-surface shadow-control', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 shrink-0 border-l border-line px-3 text-sm whitespace-nowrap transition-colors first:border-l-0',
            value === o.value ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-subtle hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 다중 선택 칩 (예: 수능/내신 태그) */
export function ChipToggle({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'h-8 rounded-md px-3 text-sm transition-colors',
        selected ? 'bg-accent-soft font-medium text-accent shadow-[inset_0_0_0_1px_var(--accent)]' : 'bg-surface text-muted shadow-control hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
