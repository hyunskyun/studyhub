import { AlertTriangle, CalendarDays, CheckSquare, ChevronRight, GraduationCap, Play, Target, Timer } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { href } from '../../app/router'
import { useNow } from '../../app/useNow'
import { Badge, DDayBadge, SubjectDot } from '../../components/ui/Badge'
import { Card, EmptyState, PageHeader, ProgressBar } from '../../components/ui/Layout'
import { percentLabel } from '../../components/ui/cn'
import { sortTodos, studyMinutesByDay, todoOverdue, upcomingDeadlines, PRIORITY_LABEL } from '../../domain/logic'
import { formatClock, formatDay, formatMinutes, formatTime, kstDateOf, studyDayOf } from '../../domain/time'
import { AGENDA_LABEL, agendaForDay } from '../shared/agenda'

function LinkAction({ to, children }: { to: string; children: string }) {
  return (
    <a href={href(to)} className="inline-flex h-9 items-center gap-0.5 rounded-lg px-2 text-sm text-muted hover:bg-subtle hover:text-fg">
      {children}
      <ChevronRight className="size-4" />
    </a>
  )
}

export default function HomePage() {
  const now = useNow(1000)
  const { data, subject, subjectName } = useAppData()
  const today = studyDayOf(now)
  const beforeBoundary = kstDateOf(now) !== today

  const deadlines = upcomingDeadlines(data, now, (id) => subjectName(id))
  const urgent = deadlines.filter((d) => d.dday <= 1)
  const later = deadlines.filter((d) => d.dday > 1).slice(0, 4)
  const agenda = agendaForDay(data, today, subjectName)
  const todos = sortTodos(data.todos.filter((t) => !t.done)).slice(0, 5)
  const todayMinutes = studyMinutesByDay(data.sessions)[today] ?? 0
  const dayGoals = data.goals.filter((g) => g.period === 'day' && !g.subjectId)
  const timer = data.activeTimer

  return (
    <>
      <PageHeader
        title="오늘"
        description={
          <>
            {formatDay(today, true)}
            {beforeBoundary && <span className="ml-1">· 05:00 전이라 전날 학습일을 표시합니다</span>}
          </>
        }
      />

      {/* 시험·수행평가 오늘/내일: 최우선 노출 (Q35) */}
      {urgent.length > 0 && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {urgent.map((d) => (
            <a
              key={d.id}
              href={href(d.kind === 'project' ? '/projects' : '/exams')}
              className="flex min-h-14 min-w-0 items-center gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3"
            >
              <AlertTriangle className="size-5 shrink-0 text-danger" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{d.title}</span>
                <span className="text-xs text-muted">{d.kind === 'project' ? '수행평가 마감' : '시험'} · {formatDay(d.date)}</span>
              </span>
              <DDayBadge dday={d.dday} />
            </a>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <Card title="오늘 일정" action={<LinkAction to="/calendar">캘린더</LinkAction>}>
            {agenda.length === 0 ? (
              <EmptyState compact icon={<CalendarDays className="size-6" />} title="오늘 일정이 없습니다" description="캘린더에서 학습 계획이나 일정을 추가하세요." />
            ) : (
              <ul className="divide-y divide-line">
                {agenda.map((a) => (
                  <li key={a.id} className={`flex min-h-12 items-center gap-3 py-2 ${a.cancelled ? 'opacity-50' : ''}`}>
                    <span className="tabular w-24 shrink-0 text-sm text-muted">
                      {formatTime(a.start)}–{formatTime(a.end)}
                    </span>
                    <SubjectDot color={subject(a.subjectId)?.color} />
                    <span className={`min-w-0 flex-1 truncate ${a.cancelled ? 'line-through' : ''}`}>{a.title}</span>
                    {a.note && <Badge tone="warning">{a.note}</Badge>}
                    <Badge tone={a.kind === 'plan' ? 'accent' : 'neutral'}>{AGENDA_LABEL[a.kind]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="할 일" action={<LinkAction to="/todos">전체</LinkAction>}>
            {todos.length === 0 ? (
              <EmptyState compact icon={<CheckSquare className="size-6" />} title="남은 할 일이 없습니다" />
            ) : (
              <ul className="divide-y divide-line">
                {todos.map((t) => {
                  const todaySubs = t.subtasks.filter((s) => !s.done && s.dueDate === today)
                  return (
                    <li key={t.id} className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate">{t.title}</span>
                        {todoOverdue(t, now) && <Badge tone="danger">기한 초과</Badge>}
                        <Badge tone={t.priority === 'high' ? 'accent' : 'neutral'}>{PRIORITY_LABEL[t.priority]}</Badge>
                      </div>
                      {todaySubs.length > 0 && (
                        <p className="mt-1 text-xs text-muted">오늘 마감 하위 항목 {todaySubs.length}개 · {todaySubs.map((s) => s.title).join(', ')}</p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card title="타이머" action={<LinkAction to="/timer">열기</LinkAction>}>
            {timer ? (
              <div>
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <SubjectDot color={subject(timer.subjectId)?.color} />
                  {subjectName(timer.subjectId)} · {timer.breakStart ? '휴식 중' : '공부 중'}
                </p>
                <p className="tabular mt-1 text-4xl font-bold tracking-tight">{formatClock(now - Date.parse(timer.segmentStart))}</p>
              </div>
            ) : (
              <a href={href('/timer')} className="flex h-14 items-center justify-center gap-2 rounded-xl bg-accent font-medium text-accent-fg">
                <Play className="size-5" /> 공부 시작
              </a>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
              <Timer className="size-4" /> 오늘 자습 {formatMinutes(todayMinutes)}
            </p>
          </Card>

          <Card title="오늘 목표" action={<LinkAction to="/stats">통계</LinkAction>}>
            {dayGoals.length === 0 ? (
              <EmptyState compact icon={<Target className="size-6" />} title="설정된 목표가 없습니다" />
            ) : (
              <ul className="space-y-3">
                {dayGoals.map((g) => {
                  // 수량 목표의 일별 집계는 2단계(완료 학습일 메타데이터)에서 연결
                  const value = g.metric === 'minutes' ? todayMinutes : undefined
                  return (
                    <li key={g.id}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{g.metric === 'minutes' ? `자습 ${formatMinutes(g.target)}` : g.metric === 'todos' ? `할 일 ${g.target}개 완료` : `Part ${g.target}개 완료`}</span>
                        <span className="tabular text-muted">{value === undefined ? '–' : percentLabel(value, g.target)}</span>
                      </div>
                      <ProgressBar value={value ?? 0} max={g.target} />
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card title="다가오는 시험·수행평가">
            {later.length === 0 && urgent.length === 0 ? (
              <EmptyState compact icon={<GraduationCap className="size-6" />} title="예정된 시험·수행평가가 없습니다" />
            ) : later.length === 0 ? (
              <p className="text-sm text-muted">위에 표시된 항목 외에는 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {later.map((d) => (
                  <li key={d.id} className="flex min-h-10 items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[15px]">{d.title}</span>
                    <DDayBadge dday={d.dday} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
