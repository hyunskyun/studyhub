import { useState } from 'react'
import { BarChart3, Plus, Target } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAppData } from '../../app/data-context'
import { useNow } from '../../app/useNow'
import { SubjectDot } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { percentLabel } from '../../components/ui/cn'
import { Segmented, Select } from '../../components/ui/Form'
import { Card, EmptyState, PageHeader, ProgressBar, Stat } from '../../components/ui/Layout'
import { academyMinutesByDay, goalValue, sessionStudyMinutes, studyMinutesByDay, workbookProgress } from '../../domain/logic'
import { addDays, formatMinutes, formatShortDay, minutesBetween, studyDayOf } from '../../domain/time'
import type { ExamTag, Goal } from '../../domain/types'
import { GoalEditor } from './GoalEditor'

type Range = 'week' | 'month'
type Source = 'self' | 'academy' | 'all'
type TagFilter = 'all' | ExamTag

const PERIOD_LABEL = { day: '일간', week: '주간', month: '월간' } as const

export default function StatsPage() {
  const now = useNow()
  const { data, subject, subjectName } = useAppData()
  const [range, setRange] = useState<Range>('week')
  const [source, setSource] = useState<Source>('all')
  const [tag, setTag] = useState<TagFilter>('all')
  const [subjectId, setSubjectId] = useState('')
  const [goalEditor, setGoalEditor] = useState<{ goal: Goal | null } | null>(null)

  const today = studyDayOf(now)
  const len = range === 'week' ? 7 : 30
  const days = Array.from({ length: len }, (_, i) => addDays(today, i - len + 1))

  // 수능·내신 두 태그 세션은 각 필터에 나타나지만 전체에서는 한 번만 집계 (Q1)
  const sessions = data.sessions.filter((s) => (!subjectId || s.subjectId === subjectId) && (tag === 'all' || s.tags.includes(tag)))
  const classes = data.classes.filter((c) => !subjectId || data.courses.find((co) => co.id === c.courseId)?.subjectId === subjectId)
  const selfByDay = studyMinutesByDay(sessions)
  const acadByDay = tag === 'all' ? academyMinutesByDay(classes) : {}

  const chart = days.map((d) => ({
    label: formatShortDay(d),
    자습: source !== 'academy' ? (selfByDay[d] ?? 0) : 0,
    학원: source !== 'self' ? (acadByDay[d] ?? 0) : 0,
  }))
  const selfTotal = chart.reduce((s, r) => s + r.자습, 0)
  const acadTotal = chart.reduce((s, r) => s + r.학원, 0)
  const planTotal = data.blocks
    .filter((b) => days.includes(studyDayOf(b.start)) && (!subjectId || b.subjectId === subjectId))
    .reduce((s, b) => s + minutesBetween(b.start, b.end), 0)

  const bySubject = new Map<string, number>()
  for (const s of sessions.filter((x) => days.includes(studyDayOf(x.start)))) bySubject.set(s.subjectId, (bySubject.get(s.subjectId) ?? 0) + sessionStudyMinutes(s))
  const subjectRows = [...bySubject].sort((a, b) => b[1] - a[1])
  const maxSub = Math.max(1, ...subjectRows.map(([, m]) => m))


  const causeCount = new Map<string, number>()
  for (const e of data.mockExams) for (const a of e.attempts.filter((x) => x.attemptNo === 1)) for (const w of a.wrong) causeCount.set(w.causeId, (causeCount.get(w.causeId) ?? 0) + 1)

  const usedSubjects = [...new Set([...data.sessions.map((s) => s.subjectId), ...data.courses.map((c) => c.subjectId)])]
  const hasAny = data.sessions.length > 0 || data.classes.length > 0

  return (
    <>
      <PageHeader
        title="목표·통계"
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setGoalEditor({ goal: null })}>
            목표 추가
          </Button>
        }
      />

      <Card title="목표" className="mb-4">
        {data.goals.length === 0 ? (
          <EmptyState compact icon={<Target className="size-6" />} title="설정된 목표가 없습니다" description="일간·주간·월간 자습 시간, 완료 Part 수, 완료 할 일 수를 목표로 정할 수 있습니다." />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {data.goals.map((g) => {
              const v = goalValue(g, data, today)
              const label = g.metric === 'minutes' ? `자습 ${formatMinutes(g.target)}` : g.metric === 'parts' ? `Part ${g.target}개` : `할 일 ${g.target}개`
              return (
                <li key={g.id} className="-mx-2 cursor-pointer rounded-md px-2 py-1 hover:bg-subtle" onClick={() => setGoalEditor({ goal: g })}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="text-muted">{PERIOD_LABEL[g.period]}</span>
                      {g.subjectId && (
                        <>
                          <SubjectDot color={subject(g.subjectId)?.color} />
                          {subjectName(g.subjectId)}
                        </>
                      )}
                      <span className="truncate">{label}</span>
                    </span>
                    <span className="tabular shrink-0 font-semibold">{percentLabel(v, g.target)}</span>
                  </div>
                  <ProgressBar value={v} max={g.target} tone={v >= g.target ? 'success' : 'accent'} />
                  <p className="mt-1 text-xs text-muted">{g.metric === 'minutes' ? `${formatMinutes(v)} / ${formatMinutes(g.target)}` : `${v} / ${g.target}개`}</p>
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted">시간 목표에는 자습만 반영됩니다. 학원 수업 시간은 아래 통계에서 따로 볼 수 있습니다. 100%를 넘으면 그대로 표시합니다.</p>
      </Card>
      {goalEditor && <GoalEditor key={goalEditor.goal?.id ?? 'new'} goal={goalEditor.goal} onClose={() => setGoalEditor(null)} />}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented label="기간" value={range} onChange={setRange} options={[{ value: 'week', label: '최근 7일' }, { value: 'month', label: '최근 30일' }]} />
        <Segmented label="집계 대상" value={source} onChange={setSource} options={[{ value: 'all', label: '전체' }, { value: 'self', label: '자습' }, { value: 'academy', label: '학원' }]} />
        <Segmented label="태그" value={tag} onChange={setTag} options={[{ value: 'all', label: '모든 태그' }, { value: 'suneung', label: '수능' }, { value: 'naesin', label: '내신' }]} />
        <Select aria-label="과목" className="w-auto min-w-32" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">전체 과목</option>
          {usedSubjects.map((id) => (
            <option key={id} value={id}>
              {subjectName(id)}
            </option>
          ))}
        </Select>
      </div>

      {!hasAny ? (
        <Card>
          <EmptyState icon={<BarChart3 className="size-6" />} title="아직 통계가 없습니다" description="공부 기록이나 학원 출석이 쌓이면 여기에서 볼 수 있습니다." />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2" title="학습 시간">
            <div className="mb-4 grid grid-cols-3 gap-4">
              <Stat label="자습" value={formatMinutes(selfTotal)} />
              <Stat label="학원" value={tag === 'all' ? formatMinutes(acadTotal) : '–'} sub={tag !== 'all' ? '태그 필터 시 제외' : undefined} />
              <Stat label="계획 대비" value={planTotal ? percentLabel(selfTotal, planTotal) : '–'} sub={planTotal ? `계획 ${formatMinutes(planTotal)}` : '계획 없음'} />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--faint)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={range === 'month' ? 4 : 0} />
                  <YAxis stroke="var(--faint)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v / 60)}h`} />
                  <Tooltip
                    formatter={(v) => formatMinutes(Number(v))}
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--fg)' }}
                    cursor={{ fill: 'var(--subtle)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="자습" stackId="a" fill="var(--accent)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="학원" stackId="a" fill="var(--sub-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="과목별 자습">
            {subjectRows.length === 0 ? (
              <p className="text-sm text-muted">이 기간 기록이 없습니다.</p>
            ) : (
              <ul className="space-y-3">
                {subjectRows.map(([id, m]) => (
                  <li key={id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <SubjectDot color={subject(id)?.color} /> {subjectName(id)}
                      </span>
                      <span className="tabular text-muted">{formatMinutes(m)}</span>
                    </div>
                    <ProgressBar value={m} max={maxSub} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="문제집 진행률">
            {data.workbooks.length === 0 ? (
              <p className="text-sm text-muted">문제집이 없습니다.</p>
            ) : (
              <ul className="space-y-3">
                {data.workbooks.map((w) => {
                  const p = workbookProgress(w)
                  return (
                    <li key={w.id}>
                      <div className="mb-1 flex justify-between gap-2 text-sm">
                        <span className="truncate">{w.title}</span>
                        <span className="tabular shrink-0 text-muted">{percentLabel(p.done, p.total)}</span>
                      </div>
                      <ProgressBar value={p.done} max={p.total} tone={p.complete ? 'success' : 'accent'} />
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card title="오답 원인 (첫 응시)">
            {causeCount.size === 0 ? (
              <p className="text-sm text-muted">오답 기록이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {[...causeCount]
                  .sort((a, b) => b[1] - a[1])
                  .map(([id, n]) => (
                    <li key={id} className="flex justify-between text-sm">
                      <span>{data.errorCauses.find((c) => c.id === id)?.name ?? '분류 없음'}</span>
                      <span className="tabular text-muted">{n}문항</span>
                    </li>
                  ))}
              </ul>
            )}
          </Card>

          <Card title="수행평가">
            {data.projects.length === 0 ? (
              <p className="text-sm text-muted">수행평가가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Stat label="진행 중" value={data.projects.filter((p) => !p.submitted).length} />
                <Stat label="제출" value={data.projects.filter((p) => p.submitted).length} />
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
