import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { GripVertical, Repeat } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { cn } from '../../components/ui/cn'
import { formatTime, minutesFromStudyDayStart, overlaps, studyDayStartMs, type DateStr } from '../../domain/time'
import type { TimeBlock } from '../../domain/types'
import type { AgendaItem } from '../shared/agenda'

const PX_PER_MIN = 1 // 60px / 시간
const SNAP = 10
const HOURS = Array.from({ length: 24 }, (_, i) => (i + 5) % 24)

type Drag = { id: string; mode: 'move' | 'resize'; y0: number; start0: number; end0: number }

/** 겹치는 일정끼리 열을 나눠 배치 */
function layoutColumns<T extends { start: string; end: string }>(items: T[]) {
  const cols: T[][] = []
  const placed = items.map((it) => {
    let c = cols.findIndex((col) => !col.some((o) => overlaps(o.start, o.end, it.start, it.end)))
    if (c === -1) c = cols.push([]) - 1
    cols[c].push(it)
    return { it, col: c }
  })
  return { placed, count: Math.max(1, cols.length) }
}

export function DayTimeline({
  day,
  blocks,
  events,
  onBlocksChange,
  onOpenBlock,
  onOpenEvent,
  nowMs,
}: {
  day: DateStr
  blocks: TimeBlock[]
  events: AgendaItem[]
  onBlocksChange: (b: TimeBlock[]) => void
  onOpenBlock: (b: TimeBlock) => void
  onOpenEvent: (e: AgendaItem) => void
  nowMs: number
}) {
  const { subject, subjectName } = useAppData()
  const drag = useRef<Drag | null>(null)
  const [draft, setDraft] = useState<{ id: string; start: string; end: string } | null>(null)

  const top = (iso: string) => minutesFromStudyDayStart(iso, day) * PX_PER_MIN
  const height = (s: string, e: string) => Math.max(24, (Date.parse(e) - Date.parse(s)) / 60_000) * PX_PER_MIN

  const shown = blocks.map((b) => (draft?.id === b.id ? { ...b, start: draft.start, end: draft.end } : b))
  const conflictIds = new Set(
    shown.filter((a) => shown.some((b) => b.id !== a.id && overlaps(a.start, a.end, b.start, b.end))).map((b) => b.id),
  )

  function beginDrag(e: ReactPointerEvent, b: TimeBlock, mode: Drag['mode']) {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { id: b.id, mode, y0: e.clientY, start0: Date.parse(b.start), end0: Date.parse(b.end) }
  }

  function moveDrag(e: ReactPointerEvent) {
    const d = drag.current
    if (!d) return
    const delta = Math.round((e.clientY - d.y0) / PX_PER_MIN / SNAP) * SNAP * 60_000
    const dayStart = studyDayStartMs(day)
    const dayEnd = dayStart + 24 * 3_600_000
    let s = d.start0
    let en: number
    if (d.mode === 'move') {
      s = Math.min(Math.max(dayStart, d.start0 + delta), dayEnd - (d.end0 - d.start0))
      en = s + (d.end0 - d.start0)
    } else {
      en = Math.min(dayEnd, Math.max(d.start0 + SNAP * 60_000, d.end0 + delta))
    }
    setDraft({ id: d.id, start: new Date(s).toISOString(), end: new Date(en).toISOString() })
  }

  function endDrag() {
    const d = drag.current
    drag.current = null
    if (!d || !draft) return setDraft(null)
    const next = blocks.map((b) => (b.id === draft.id ? { ...b, start: draft.start, end: draft.end } : b))
    const moved = next.find((b) => b.id === draft.id)!
    const clash = next.some((b) => b.id !== moved.id && overlaps(b.start, b.end, moved.start, moved.end))
    // 학습 계획끼리 겹치면 저장 차단 (Q69): 원래 위치로 되돌린다
    if (!clash) onBlocksChange(next)
    setDraft(null)
  }

  const ev = layoutColumns(events)
  const nowTop = nowMs >= studyDayStartMs(day) && nowMs < studyDayStartMs(day) + 86_400_000 ? top(new Date(nowMs).toISOString()) : null

  return (
    <div className="relative overflow-clip rounded-2xl border border-line bg-surface">
      <div className="sticky top-0 z-10 grid grid-cols-[52px_1fr_1fr] border-b border-line bg-surface text-xs font-medium text-muted">
        <span />
        <span className="border-l border-line px-2 py-2">일정·수업</span>
        <span className="border-l border-line px-2 py-2">학습 계획</span>
      </div>
      <div className="relative grid grid-cols-[52px_1fr_1fr]" style={{ height: 24 * 60 * PX_PER_MIN }}>
        <div className="relative">
          {HOURS.map((h, i) => (
            <span key={i} className="tabular absolute right-2 -translate-y-1/2 text-[11px] text-faint" style={{ top: i * 60 * PX_PER_MIN }}>
              {i === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
            </span>
          ))}
        </div>
        {[0, 1].map((lane) => (
          <div key={lane} className="relative border-l border-line">
            {HOURS.map((_, i) => (
              <div key={i} className="absolute inset-x-0 border-t border-line/70" style={{ top: i * 60 * PX_PER_MIN }} />
            ))}
          </div>
        ))}

        {/* 일정·수업 레인 */}
        <div className="pointer-events-none absolute inset-y-0 left-[52px] w-[calc((100%-52px)/2)]">
          {ev.placed.map(({ it, col }) => (
            <button
              key={it.id}
              type="button"
              onClick={() => onOpenEvent(it)}
              className={cn(
                'pointer-events-auto absolute overflow-hidden rounded-lg border border-line bg-subtle px-2 py-1 text-left text-xs',
                it.cancelled && 'opacity-50',
              )}
              style={{
                top: top(it.start),
                height: height(it.start, it.end),
                left: `calc(${(col / ev.count) * 100}% + 3px)`,
                width: `calc(${100 / ev.count}% - 6px)`,
              }}
            >
              <span className={cn('flex items-center gap-1 font-medium', it.cancelled && 'line-through')}>
                {it.recurring && <Repeat className="size-3 shrink-0 text-faint" />}
                <span className="truncate">{it.title}</span>
              </span>
              <span className="tabular block truncate text-muted">
                {formatTime(it.start)}–{formatTime(it.end)} {it.note ?? ''}
              </span>
            </button>
          ))}
        </div>

        {/* 학습 계획 레인: 드래그 이동·크기 조절 (Q68) */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[calc((100%-52px)/2)]">
          {shown.map((b) => {
            const color = subject(b.subjectId)?.color ?? 0
            const bad = conflictIds.has(b.id)
            return (
              <div
                key={b.id}
                className={cn(
                  'pointer-events-auto absolute inset-x-1 overflow-hidden rounded-lg border-l-4 text-xs shadow-sm',
                  bad ? 'bg-danger-soft ring-2 ring-danger' : 'bg-accent-soft',
                  draft?.id === b.id && 'opacity-90 shadow-lg',
                )}
                style={{ top: top(b.start), height: height(b.start, b.end), borderLeftColor: `var(--sub-${color % 6})` }}
              >
                <button type="button" onClick={() => onOpenBlock(b)} className="absolute inset-0 px-2 py-1 pr-9 text-left">
                  <span className="block truncate font-semibold">{subjectName(b.subjectId)}</span>
                  <span className="tabular block truncate text-muted">
                    {formatTime(b.start)}–{formatTime(b.end)}
                  </span>
                  {bad && <span className="block truncate font-medium text-danger">다른 계획과 겹침 · 저장 불가</span>}
                </button>
                <span
                  role="button"
                  aria-label={`${subjectName(b.subjectId)} 계획 이동`}
                  onPointerDown={(e) => beginDrag(e, b, 'move')}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className="absolute top-0 right-0 flex h-full max-h-11 w-9 cursor-grab touch-none items-center justify-center text-muted"
                >
                  <GripVertical className="size-4" />
                </span>
                <span
                  role="button"
                  aria-label={`${subjectName(b.subjectId)} 계획 길이 조절`}
                  onPointerDown={(e) => beginDrag(e, b, 'resize')}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className="absolute inset-x-0 bottom-0 flex h-3 cursor-ns-resize touch-none justify-center"
                >
                  <span className="mt-1 h-1 w-8 rounded-full bg-faint/60" />
                </span>
              </div>
            )
          })}
        </div>

        {nowTop !== null && (
          <div className="pointer-events-none absolute right-0 left-[48px] z-[5] flex items-center" style={{ top: nowTop }}>
            <span className="size-2 rounded-full bg-danger" />
            <span className="h-px flex-1 bg-danger" />
          </div>
        )}
      </div>
    </div>
  )
}
