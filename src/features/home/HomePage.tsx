import type { ReactNode } from 'react'
import { ChevronRight, Play } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { href } from '../../app/router'
import { useNow } from '../../app/useNow'
import { Badge, DDayBadge, SubjectDot, type Tone } from '../../components/ui/Badge'
import { cn, percentLabel } from '../../components/ui/cn'
import { EmptyState, PageHeader, ProgressBar } from '../../components/ui/Layout'
import {
  academyMinutesByDay,
  PRIORITY_LABEL,
  sortTodos,
  studyMinutesByDay,
  todoOverdue,
  upcomingDeadlines,
  workbookProgress,
} from '../../domain/logic'
import { addDays, formatClock, formatDay, formatMinutes, formatShortDay, formatTime, kstDateOf, minutesBetween, studyDayOf } from '../../domain/time'
import { AGENDA_LABEL, agendaForDay } from '../shared/agenda'
import { Sparkline } from '../shared/Sparkline'

function MoreLink({ to, children }: { to: string; children: string }) {
  return (
    <a href={href(to)} className="inline-flex h-8 items-center gap-0.5 text-sm text-accent hover:text-fg">
      {children}
      <ChevronRight className="size-3.5" />
    </a>
  )
}

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (prev === 0) return null
  const pct = ((cur - prev) / prev) * 100
  const tone: Tone = pct >= 0 ? 'success' : 'warning'
  return (
    <Badge tone={tone} className="tabular">
      {pct >= 0 ? '+' : ''}
      {pct.toFixed(1)}%
    </Badge>
  )
}

/** 요약 지표 칸: 라벨·변화율, 강조색 값, 이전 기간 값 */
function Metric({ label, delta, value, prev, children }: { label: string; delta?: ReactNode; value: ReactNode; prev?: ReactNode; children?: ReactNode }) {
  return (
    <div className="min-w-0 bg-surface p-4 md:px-5">
      <p className="flex items-center gap-2 text-sm text-fg">
        {label}
        {delta}
      </p>
      <div className="mt-1 mb-3 flex items-baseline justify-between gap-2">
        <span className="tabular truncate text-2xl text-accent">{value}</span>
        {prev !== undefined && <span className="tabular shrink-0 text-base text-muted">{prev}</span>}
      </div>
      {children}
    </div>
  )
}

export default function HomePage() {
  const now = useNow(1000)
  const { data, subject, subjectName } = useAppData()
  const today = studyDayOf(now)
  const beforeBoundary = kstDateOf(now) !== today

  const deadlines = upcomingDeadlines(data, now, (id) => subjectName(id))
  const urgent = deadlines.filter((d) => d.dday <= 1) // 오늘/내일: 최우선 노출 (Q35)
  const later = deadlines.filter((d) => d.dday > 1).slice(0, 4)
  const agenda = agendaForDay(data, today, subjectName)
  const todos = sortTodos(data.todos.filter((t) => !t.done)).slice(0, 5)
  const timer = data.activeTimer

  // 최근 7학습일 vs 그 이전 7학습일
  const self = studyMinutesByDay(data.sessions)
  const acad = academyMinutesByDay(data.classes)
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const prevDays = days.map((d) => addDays(d, -7))
  const sum = (m: Record<string, number>, ds: string[]) => ds.reduce((s, d) => s + (m[d] ?? 0), 0)
  const selfCur = sum(self, days)
  const selfPrev = sum(self, prevDays)
  const acadCur = sum(acad, days)
  const acadPrev = sum(acad, prevDays)
  const planned = data.blocks.filter((b) => days.includes(studyDayOf(b.start))).reduce((s, b) => s + minutesBetween(b.start, b.end), 0)
  const todayMinutes = self[today] ?? 0
  const dayGoal = data.goals.find((g) => g.period === 'day' && g.metric === 'minutes' && !g.subjectId)
  const parts = data.workbooks.map(workbookProgress)
  const partDone = parts.reduce((s, p) => s + p.done, 0)
  const partTotal = parts.reduce((s, p) => s + p.total, 0)
  const overdue = data.todos.filter((t) => todoOverdue(t, now)).length
  const spark = (m: Record<string, number>) => days.map((d, i) => ({ label: formatShortDay(d), cur: m[d] ?? 0, prev: m[prevDays[i]] ?? 0 }))

  return (
    <>
      <PageHeader
        title="홈"
        description={
          <>
            {formatDay(today, true)}
            {beforeBoundary && ' · 05:00 전이라 전날 학습일을 표시합니다'}
          </>
        }
      />

      {urgent.length > 0 && (
        <section aria-label="오늘·내일 마감" className="mb-4 divide-y divide-line rounded-lg bg-surface shadow-panel">
          {urgent.map((d) => (
            <a key={d.id} href={href(d.kind === 'project' ? '/projects' : '/exams')} className="flex min-h-11 min-w-0 items-center gap-3 px-4 py-2 hover:bg-subtle md:px-5">
              <span className="size-1.5 shrink-0 rounded-full bg-danger" />
              <span className="min-w-0 flex-1 truncate font-medium">{d.title}</span>
              <span className="hidden text-sm text-muted sm:inline">
                {d.kind === 'project' ? '수행평가 마감' : '시험'} · {formatDay(d.date)}
              </span>
              <DDayBadge dday={d.dday} />
            </a>
          ))}
        </section>
      )}

      {/* 오늘: 일정 | 타이머·목표 */}
      <section className="mb-5 rounded-lg bg-surface shadow-panel">
        <div className="flex min-h-14 items-center justify-between gap-2 border-b border-line px-4 md:px-5">
          <h2 className="text-lg font-semibold">오늘</h2>
          <a href={href('/timer')} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-surface px-3 text-sm font-medium shadow-control hover:bg-subtle">
            <Play className="size-3.5" /> {timer ? '타이머 열기' : '공부 시작'}
          </a>
        </div>
        <div className="grid lg:grid-cols-3">
          <div className="min-w-0 bg-subtle/60 p-4 md:px-5 lg:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm text-muted">일정 {agenda.length}개</p>
              <MoreLink to="/calendar">캘린더</MoreLink>
            </div>
            {agenda.length === 0 ? (
              <EmptyState compact title="오늘 일정이 없습니다" description="캘린더에서 학습 계획이나 일정을 추가하세요." />
            ) : (
              <ul className="divide-y divide-line">
                {agenda.map((a) => (
                  <li key={a.id} className={cn('flex min-h-9 items-center gap-3 py-1', a.cancelled && 'opacity-50')}>
                    <span className="tabular w-[86px] shrink-0 text-sm text-muted">
                      {formatTime(a.start)}–{formatTime(a.end)}
                    </span>
                    <SubjectDot color={subject(a.subjectId)?.color} />
                    <span className={cn('min-w-0 flex-1 truncate', a.cancelled && 'line-through')}>{a.title}</span>
                    {a.note && <Badge tone="warning">{a.note}</Badge>}
                    <span className={cn('shrink-0 text-xs', a.kind === 'plan' ? 'text-accent' : 'text-faint')}>{AGENDA_LABEL[a.kind]}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="divide-y divide-line border-t border-line lg:border-t-0 lg:border-l">
            <div className="p-4 md:px-5">
              <p className="flex items-center gap-1.5 text-sm text-fg">
                {timer ? (
                  <>
                    <SubjectDot color={subject(timer.subjectId)?.color} /> {subjectName(timer.subjectId)} · {timer.breakStart ? '휴식 중' : '공부 중'}
                  </>
                ) : (
                  '타이머'
                )}
              </p>
              <p className="tabular mt-1 text-3xl text-accent">{timer ? formatClock(now - Date.parse(timer.segmentStart)) : '00:00:00'}</p>
              <p className="mt-1 text-sm text-muted">{timer ? '현재 구간' : '실행 중인 타이머 없음'}</p>
            </div>
            <div className="p-4 md:px-5">
              <p className="text-sm text-fg">오늘 자습</p>
              <p className="tabular mt-1 text-2xl text-accent">{formatMinutes(todayMinutes)}</p>
              {dayGoal ? (
                <>
                  <ProgressBar className="mt-2" value={todayMinutes} max={dayGoal.target} />
                  <p className="mt-1.5 text-sm text-muted">
                    목표 {formatMinutes(dayGoal.target)} · {percentLabel(todayMinutes, dayGoal.target)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted">일간 목표 없음</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 학습 요약: 최근 7일, 지난 7일과 비교 */}
      <section className="mb-5 rounded-lg bg-surface shadow-panel">
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-line px-4 md:px-5">
          <h2 className="text-lg font-semibold">학습 요약</h2>
          <span className="text-sm text-muted">
            최근 7일 ({formatShortDay(days[0])}–{formatShortDay(today)}) · 지난 7일과 비교
          </span>
        </div>
        <div className="grid gap-px overflow-hidden rounded-b-lg bg-line sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="자습 시간" delta={<Delta cur={selfCur} prev={selfPrev} />} value={formatMinutes(selfCur)} prev={formatMinutes(selfPrev)}>
            <Sparkline data={spark(self)} format={formatMinutes} />
          </Metric>
          <Metric label="학원 수업" delta={<Delta cur={acadCur} prev={acadPrev} />} value={formatMinutes(acadCur)} prev={formatMinutes(acadPrev)}>
            <Sparkline data={spark(acad)} format={formatMinutes} />
          </Metric>
          <Metric label="계획 대비 자습" value={planned ? percentLabel(selfCur, planned) : '–'} prev={planned ? `계획 ${formatMinutes(planned)}` : '계획 없음'}>
            <ProgressBar value={selfCur} max={planned || 1} />
            <p className="mt-2 text-xs text-muted">학원 시간은 자습 목표·계획 대비에 포함하지 않습니다.</p>
          </Metric>
          <Metric label="할 일" value={`${data.todos.filter((t) => !t.done).length}개 남음`} prev={overdue ? <span className="text-danger">기한 초과 {overdue}</span> : undefined}>
            {todos.length === 0 ? (
              <p className="text-sm text-muted">남은 할 일이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-line">
                {todos.map((t) => (
                  <li key={t.id} className="flex min-h-8 items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                    {todoOverdue(t, now) ? <Badge tone="danger">초과</Badge> : <span className="text-xs text-faint">{PRIORITY_LABEL[t.priority]}</span>}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-1">
              <MoreLink to="/todos">전체 보기</MoreLink>
            </div>
          </Metric>
          <Metric label="다가오는 시험·수행평가" value={`${deadlines.length}건`}>
            {later.length === 0 ? (
              <p className="text-sm text-muted">{urgent.length ? '위에 표시된 항목 외에는 없습니다.' : '예정된 항목이 없습니다.'}</p>
            ) : (
              <ul className="divide-y divide-line">
                {later.map((d) => (
                  <li key={d.id} className="flex min-h-8 items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm">{d.title}</span>
                    <DDayBadge dday={d.dday} />
                  </li>
                ))}
              </ul>
            )}
          </Metric>
          <Metric label="문제집 진행률" value={partTotal ? percentLabel(partDone, partTotal) : '–'} prev={partTotal ? `Part ${partDone}/${partTotal}` : undefined}>
            {data.workbooks.length === 0 ? (
              <p className="text-sm text-muted">등록된 문제집이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {data.workbooks.slice(0, 3).map((w, i) => (
                  <li key={w.id}>
                    <div className="mb-1 flex justify-between gap-2 text-sm">
                      <span className="truncate">{w.title}</span>
                      <span className="tabular shrink-0 text-muted">{percentLabel(parts[i].done, parts[i].total)}</span>
                    </div>
                    <ProgressBar value={parts[i].done} max={parts[i].total} tone={parts[i].complete ? 'success' : 'accent'} />
                  </li>
                ))}
              </ul>
            )}
          </Metric>
        </div>
      </section>
    </>
  )
}
