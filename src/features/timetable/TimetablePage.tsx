import { useState } from 'react'
import { Minus, Pencil, Plus, Table2 } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useNow } from '../../app/useNow'
import { useRun } from '../../app/useRun'
import { Button } from '../../components/ui/Button'
import { cn } from '../../components/ui/cn'
import { Card, EmptyState, PageHeader } from '../../components/ui/Layout'
import { kstDateOf, weekdayOf } from '../../domain/time'
import type { TimetableSlot } from '../../domain/types'

const DAYS = ['월', '화', '수', '목', '금']
const DEFAULT_TIMES = [
  ['08:40', '09:30'],
  ['09:40', '10:30'],
  ['10:40', '11:30'],
  ['11:40', '12:30'],
  ['13:30', '14:20'],
  ['14:30', '15:20'],
  ['15:30', '16:20'],
]

interface Draft {
  periods: { start: string; end: string }[]
  cells: Record<string, string>
}

function toDraft(slots: TimetableSlot[]): Draft {
  const maxP = Math.max(0, ...slots.map((s) => s.period))
  const n = Math.max(maxP, slots.length ? 0 : 7)
  const periods = Array.from({ length: n }, (_, i) => {
    const any = slots.find((s) => s.period === i + 1)
    return { start: any?.start ?? DEFAULT_TIMES[i]?.[0] ?? '16:30', end: any?.end ?? DEFAULT_TIMES[i]?.[1] ?? '17:20' }
  })
  return { periods, cells: Object.fromEntries(slots.map((s) => [`${s.weekday}-${s.period}`, s.subject])) }
}

/** 학교 현재 시간표 1개 (Q36, Q106). 예외 수업은 캘린더 일정으로 (Q99). 학습 통계 제외 (Q43). */
export default function TimetablePage() {
  const now = useNow()
  const { data, actions } = useAppData()
  const { run, pending, error } = useRun()
  const [draft, setDraft] = useState<Draft | null>(null)
  const todayWd = weekdayOf(kstDateOf(now))
  const view = draft ?? toDraft(data.timetable)
  const editing = !!draft
  const timeError = view.periods.some((p) => !p.start || !p.end || p.end <= p.start) ? '교시마다 종료 시각이 시작보다 늦어야 합니다.' : undefined

  const save = async () => {
    if (!draft || timeError) return
    const slots: TimetableSlot[] = []
    draft.periods.forEach((p, i) => {
      for (let wd = 1; wd <= 5; wd++) {
        const subject = draft.cells[`${wd}-${i + 1}`]?.trim()
        if (subject) slots.push({ weekday: wd, period: i + 1, subject, start: p.start, end: p.end })
      }
    })
    if (await run(() => actions.saveTimetable(slots))) setDraft(null)
  }

  return (
    <>
      <PageHeader
        title="학교 시간표"
        description="현재 시간표 하나만 유지합니다. 특정 날짜의 변경 수업은 캘린더에 일정으로 추가하세요."
        actions={
          editing ? (
            <>
              <Button onClick={() => setDraft(null)}>취소</Button>
              <Button variant="primary" onClick={save} disabled={pending || !!timeError}>
                저장
              </Button>
            </>
          ) : (
            <Button icon={<Pencil className="size-4" />} onClick={() => setDraft(toDraft(data.timetable))}>
              편집
            </Button>
          )
        }
      />
      {data.timetable.length === 0 && !editing ? (
        <Card>
          <EmptyState
            icon={<Table2 className="size-6" />}
            title="시간표가 없습니다"
            description="월~금 교시별 과목과 시간을 입력하면 홈과 캘린더에 수업이 표시됩니다."
            action={
              <Button variant="primary" onClick={() => setDraft(toDraft([]))}>
                시간표 만들기
              </Button>
            }
          />
        </Card>
      ) : (
        <Card padded={false} className="overflow-x-auto">
          <table className="w-full min-w-[36rem] table-fixed border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-28 border-b border-line px-2 py-2.5 text-xs font-medium text-muted">교시</th>
                {DAYS.map((d, i) => (
                  <th key={d} className={cn('border-b border-line px-2 py-2.5 font-semibold', todayWd === i + 1 && 'text-accent')}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.periods.map((p, i) => (
                <tr key={i}>
                  <td className="border-b border-line px-2 py-1.5 text-center">
                    <span className="block font-medium">{i + 1}</span>
                    {editing ? (
                      <span className="mt-1 flex flex-col gap-1">
                        <input aria-label={`${i + 1}교시 시작`} type="time" value={p.start} onChange={(e) => setDraft({ ...view, periods: view.periods.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)) })} className="h-7 rounded border border-line bg-surface px-1 text-xs" />
                        <input aria-label={`${i + 1}교시 종료`} type="time" value={p.end} onChange={(e) => setDraft({ ...view, periods: view.periods.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)) })} className="h-7 rounded border border-line bg-surface px-1 text-xs" />
                      </span>
                    ) : (
                      <span className="tabular block text-[11px] text-faint">
                        {p.start}–{p.end}
                      </span>
                    )}
                  </td>
                  {DAYS.map((_, d) => {
                    const key = `${d + 1}-${i + 1}`
                    return (
                      <td key={d} className={cn('border-b border-l border-line p-1', todayWd === d + 1 && 'bg-accent-soft/40')}>
                        {editing ? (
                          <input
                            aria-label={`${DAYS[d]} ${i + 1}교시 과목`}
                            value={view.cells[key] ?? ''}
                            onChange={(e) => setDraft({ ...view, cells: { ...view.cells, [key]: e.target.value } })}
                            className="h-9 w-full rounded border border-line bg-surface px-1 text-center"
                          />
                        ) : (
                          <span className="flex h-9 items-center justify-center text-center">{view.cells[key] ?? ''}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {editing && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 md:px-5">
              <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setDraft({ ...view, periods: [...view.periods, { start: DEFAULT_TIMES[view.periods.length]?.[0] ?? '16:30', end: DEFAULT_TIMES[view.periods.length]?.[1] ?? '17:20' }] })}>
                교시 추가
              </Button>
              <Button size="sm" icon={<Minus className="size-4" />} disabled={view.periods.length <= 1} onClick={() => setDraft({ ...view, periods: view.periods.slice(0, -1) })}>
                마지막 교시 빼기
              </Button>
              <span className="text-xs text-muted">저장하면 기존 시간표를 덮어씁니다. 빈 칸은 수업 없음으로 저장됩니다.</span>
            </div>
          )}
        </Card>
      )}
      {(timeError && editing) || error ? <p className="mt-2 text-sm text-danger">{editing && timeError ? timeError : error}</p> : null}
    </>
  )
}
