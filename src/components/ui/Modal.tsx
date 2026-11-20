import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button, IconButton } from './Button'
import { cn } from './cn'

/**
 * 모달: 스마트폰에서는 하단 시트, 태블릿·PC에서는 중앙 대화상자.
 * Esc / 배경 탭으로 닫힘, 열릴 때 첫 포커스 이동, 닫힐 때 원래 포커스 복귀.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    const first = panel.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')
    first?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative flex max-h-[92svh] w-full flex-col rounded-t-xl bg-surface shadow-2xl md:rounded-lg',
          size === 'lg' ? 'md:max-w-2xl' : 'md:max-w-lg',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line py-1.5 pr-2 pl-5">
          <h2 id={titleId} className="truncate text-base font-semibold">
            {title}
          </h2>
          <IconButton label="닫기" onClick={onClose} data-close>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-subtle px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = '확인',
  tone = 'primary',
  confirmDisabled,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  children: ReactNode
  confirmLabel?: string
  tone?: 'primary' | 'danger'
  confirmDisabled?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant={tone} onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm leading-relaxed">{children}</div>
    </Modal>
  )
}
