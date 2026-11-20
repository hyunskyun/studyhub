import { useState } from 'react'
import { Pencil, Table2 } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useNow } from '../../app/useNow'
import { Button } from '../../components/ui/Button'
import { cn } from '../../components/ui/cn'
import { Card, EmptyState, PageHeader, PrototypeNotice } from '../../components/ui/Layout'
import { kstDateOf, weekdayOf } from '../../domain/time'

const DAYS = ['월', '화', '수', '목', '금']

/** 학교 현재 시간표 1개 (Q36, Q106). 예외 수업은 캘린더 일정으로 (Q99). 학습 통계 제외 (Q43). */
export default function TimetablePage() {
  const now = useNow()
  const { data } = useAppData()
  const [editing, setEditing] = useState(false)
  const todayWd = weekdayOf(kstDateOf(now))
  const periods = [...new Set(data.timetable.map((t) => t.period))].sort((a, b) => a - b)
  const cell = (wd: number, p: number) => data.timetable.find((t) => t.weekday === wd && t.period === p)

  return (
    <>
      <PageHeader
        title="학교 시간표"
        description="현재 시간표 하나만 유지합니다. 특정 날짜의 변경 수업은 캘린더에 일정으로 추가하세요."
        actions={
          <Button variant={editing ? 'primary' : 'secondary'} icon={<Pencil className="size-4" />} onClick={() => setEditing(!editing)}>
            {editing ? '편집 끝' : '편집'}
          </Button>
        }
      />
      {data.timetable.length === 0 && !editing ? (
        <Card>
          <EmptyState
            icon={<Table2 className="size-6" />}
            title="시간표가 없습니다"
            description="월~금 교시별 과목과 시간을 입력하면 홈과 캘린더에 수업이 표시됩니다."
            action={
              <Button variant="primary" onClick={() => setEditing(true)}>
                시간표 만들기
              </Button>
            }
          />
        </Card>
      ) : (
        <Card padded={false} className="overflow-x-auto">
          <table className="w-full min-w-[34rem] table-fixed border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-20 border-b border-line px-2 py-3 text-xs font-medium text-muted">교시</th>
                {DAYS.map((d, i) => (
                  <th key={d} className={cn('border-b border-line px-2 py-3 font-semibold', todayWd === i + 1 && 'text-accent')}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(periods.length ? periods : [1, 2, 3, 4, 5, 6, 7]).map((p) => {
                const any = data.timetable.find((t) => t.period === p)
                return (
                  <tr key={p}>
                    <td className="border-b border-line px-2 py-2 text-center">
                      <span className="block font-medium">{p}</span>
                      {any && <span className="tabular block text-[11px] text-faint">{any.start}</span>}
                    </td>
                    {DAYS.map((_, i) => {
                      const c = cell(i + 1, p)
                      return (
                        <td key={i} className={cn('border-b border-l border-line p-1', todayWd === i + 1 && 'bg-accent-soft/40')}>
                          {editing ? (
                            <input aria-label={`${DAYS[i]} ${p}교시`} defaultValue={c?.subject ?? ''} className="h-11 w-full rounded-lg border border-line bg-surface px-2 text-center" />
                          ) : (
                            <span className="flex h-11 items-center justify-center rounded-lg text-center">{c?.subject ?? ''}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
      {editing && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted">저장하면 기존 시간표를 덮어씁니다.</p>
          <PrototypeNotice />
        </div>
      )}
    </>
  )
}
