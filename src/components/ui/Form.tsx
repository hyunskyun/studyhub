import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from './cn'

const CONTROL =
  'w-full rounded-xl border bg-surface px-3 text-[15px] text-fg placeholder:text-faint outline-none transition-colors focus:border-accent'

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
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
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
      className={cn(CONTROL, 'h-11', invalid ? 'border-danger' : 'border-line', className)}
      {...rest}
    />
  )
}

export function TextArea({ invalid, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, 'min-h-24 py-2.5', invalid ? 'border-danger' : 'border-line', className)}
      {...rest}
    />
  )
}

export function Select({ invalid, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, 'h-11 appearance-auto', invalid ? 'border-danger' : 'border-line', className)}
      {...rest}
    >
      {children}
    </select>
  )
}

/** 큰 터치 영역의 체크 버튼 (44px). indeterminate = 부분 완료 */
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
      className="group -m-2 inline-flex size-11 shrink-0 items-center justify-center disabled:opacity-40"
    >
      <span
        className={cn(
          'flex size-6 items-center justify-center border-2 transition-colors',
          round ? 'rounded-full' : 'rounded-md',
          checked ? 'border-accent bg-accent text-accent-fg' : indeterminate ? 'border-accent text-accent' : 'border-line group-hover:border-faint',
        )}
      >
        {checked ? <Check className="size-4" strokeWidth={3} /> : indeterminate ? <Minus className="size-4" strokeWidth={3} /> : null}
      </span>
    </button>
  )
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-[15px]">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-line')}
      >
        <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5.5' : 'translate-x-0.5')} />
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
    <div role="tablist" aria-label={label} className={cn('inline-flex max-w-full overflow-x-auto rounded-xl bg-subtle p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-9 shrink-0 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors',
            value === o.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
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
        'h-9 rounded-full border px-3.5 text-sm font-medium transition-colors',
        selected ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
