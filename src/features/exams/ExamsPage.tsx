import { useState } from 'react'
import { ChevronRight, GraduationCap, Plus } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useNow } from '../../app/useNow'
import { Badge, DDayBadge, SubjectLabel } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Segmented, Select } from '../../components/ui/Form'
import { Card, EmptyState, PageHeader, ProgressBar } from '../../components/ui/Layout'
import { scopeProgress } from '../../domain/logic'
import { dDay, formatDay, formatShortDay } from '../../domain/time'
import type { MockAttempt, MockExam, MockScores } from '../../domain/types'
import { AttemptModal } from './AttemptModal'
import { ScoreChart } from './ScoreChart'

type Tab = 'mock' | 'school'
type AttemptFilter = 'first' | 'all' | 'retake'
type Metric = keyof MockScores

const METRIC_LABEL: Record<Metric, string> = { raw: '원점수', standard: '표준점수', percentile: '백분위', grade: '등급' }

function MockTab() {
  const { data, subject, subjectName } = useAppData()
  const [filter, setFilter] = useState<AttemptFilter>('first') // 기본 통계는 첫 응시만 (Q23)
  const [metric, setMetric] = useState<Metric>('raw')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [open, setOpen] = useState<{ exam: MockExam; attempt: MockAttempt } | null>(null)

  const exams = data.mockExams.filter((e) => !subjectFilter || e.subjectId === subjectFilter)
  const attempts = exams
    .flatMap((e) => e.attempts.map((a) => ({ e, a })))
    .filter(({ a }) => (filter === 'first' ? a.attemptNo === 1 : filter === 'retake' ? a.attemptNo > 1 : true))
    .sort((x, y) => x.a.solvedDate.localeCompare(y.a.solvedDate))
  const usedSubjects = [...new Set(data.mockExams.map((e) => e.subjectId))]

  if (data.mockExams.length === 0)
    return (
      <Card>
        <EmptyState icon={<GraduationCap className="size-6" />} title="모의고사 기록이 없습니다" description="시험을 과목별로 등록하고 응시 회차마다 성적과 오답을 기록합니다." />
      </Card>
    )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="응시 범위"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'first', label: '첫 응시' },
            { value: 'all', label: '전체 회차' },
            { value: 'retake', label: '재응시만' },
          ]}
        />
        <Select aria-label="과목 필터" className="w-auto min-w-32" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
          <option value="">전체 과목</option>
          {usedSubjects.map((id) => (
            <option key={id} value={id}>
              {subjectName(id)}
            </option>
          ))}
        </Select>
      </div>

      <Card
        title="성적 추이"
        action={
          <Segmented
            label="표시 지표"
            value={metric}
            onChange={setMetric}
            options={(Object.keys(METRIC_LABEL) as Metric[]).map((m) => ({ value: m, label: METRIC_LABEL[m] }))}
          />
        }
      >
        {attempts.some(({ a }) => a.scores[metric] !== undefined) ? (
          <ScoreChart
            reversed={metric === 'grade'}
            domain={metric === 'grade' ? [1, 9] : undefined}
            points={attempts.map(({ e, a }) => ({ label: `${formatShortDay(a.solvedDate)} ${subjectName(e.subjectId)}`, value: a.scores[metric] }))}
          />
        ) : (
          <EmptyState compact title={`${METRIC_LABEL[metric]}를 입력한 기록이 없습니다`} />
        )}
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {exams.map((e) => (
          <Card key={e.id} title={`${e.year}년 ${e.month}월 ${e.org}`} action={<SubjectLabel subject={subject(e.subjectId)} />}>
            <ul className="-mx-2">
              {e.attempts.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => setOpen({ exam: e, attempt: a })} className="flex min-h-10 w-full items-center gap-3 rounded-md px-2 text-left hover:bg-subtle">
                    <span className="w-14 text-sm font-semibold">{a.attemptNo === 1 ? '첫 응시' : `${a.attemptNo}회차`}</span>
                    <span className="tabular flex-1 truncate text-sm">
                      {(Object.keys(METRIC_LABEL) as Metric[])
                        .filter((m) => a.scores[m] !== undefined)
                        .map((m) => `${METRIC_LABEL[m]} ${a.scores[m]}`)
                        .join(' · ') || <span className="text-faint">점수 미입력</span>}
                    </span>
                    <Badge tone={a.wrongConfirmed ? 'neutral' : 'warning'}>오답 {a.wrong.length}{a.wrongConfirmed ? '' : ' · 미확정'}</Badge>
                    <ChevronRight className="size-4 text-faint" />
                  </button>
                </li>
              ))}
            </ul>
            <Button size="sm" variant="ghost" className="mt-1" icon={<Plus className="size-4" />}>
              재응시 추가
            </Button>
          </Card>
        ))}
      </div>
      {open && <AttemptModal exam={open.exam} attempt={open.attempt} onClose={() => setOpen(null)} />}
    </div>
  )
}

function SchoolTab() {
  const now = useNow()
  const { data, subject, subjectName } = useAppData()
  const upcoming = data.schoolExams.filter((e) => dDay(e.date, now) >= 0).sort((a, b) => a.date.localeCompare(b.date))
  const past = data.schoolExams.filter((e) => dDay(e.date, now) < 0).sort((a, b) => b.date.localeCompare(a.date))
  const trendSubject = past[0]?.subjectId
  const trend = past
    .filter((e) => e.subjectId === trendSubject)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ label: `${e.year} ${e.semester}학기 ${e.term === 'midterm' ? '중간' : '기말'}`, value: e.raw }))

  if (data.schoolExams.length === 0)
    return (
      <Card>
        <EmptyState icon={<GraduationCap className="size-6" />} title="지필 시험 기록이 없습니다" description="중간·기말고사의 시험일, 범위, 원점수와 등급을 기록합니다." />
      </Card>
    )

  return (
    <div className="space-y-4">
      {upcoming.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {upcoming.map((e) => {
            const p = scopeProgress(e, data.workbooks)
            return (
              <Card key={e.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {subjectName(e.subjectId)} {e.term === 'midterm' ? '중간고사' : '기말고사'}
                    </p>
                    <p className="text-sm text-muted">{formatDay(e.date)}</p>
                  </div>
                  <DDayBadge dday={dDay(e.date, now)} />
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-sm">
                    <span>시험 범위 진행률</span>
                    <span className="tabular text-muted">
                      Part {p.done}/{p.total}
                    </span>
                  </div>
                  <ProgressBar value={p.done} max={p.total} tone={p.total > 0 && p.done === p.total ? 'success' : 'accent'} />
                  <p className="mt-1.5 text-xs text-muted">연결된 교재의 고유 Part 기준 · 중복 연결은 한 번만 계산</p>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      {trend.length > 1 && (
        <Card title={`${subjectName(trendSubject)} 원점수 추이`}>
          <ScoreChart points={trend} domain={[0, 100]} />
        </Card>
      )}
      <Card title="지난 시험" padded={false}>
        <ul className="divide-y divide-line">
          {past.map((e) => (
            <li key={e.id} className="flex min-h-10 items-center gap-3 px-4 md:px-5">
              <span className="w-32 shrink-0 text-sm text-muted">
                {e.year} {e.semester}학기 {e.term === 'midterm' ? '중간' : '기말'}
              </span>
              <span className="min-w-0 flex-1">
                <SubjectLabel subject={subject(e.subjectId)} />
              </span>
              <span className="tabular text-sm">{e.raw !== undefined ? `${e.raw}점` : '–'}</span>
              <span className="tabular w-12 text-right text-sm">{e.grade !== undefined ? `${e.grade}등급` : '–'}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

export default function ExamsPage() {
  const [tab, setTab] = useState<Tab>('mock')
  return (
    <>
      <PageHeader
        title="시험·성적"
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />}>
            {tab === 'mock' ? '모의고사 추가' : '지필 시험 추가'}
          </Button>
        }
      />
      <Segmented
        className="mb-4"
        label="시험 종류"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'mock', label: '모의고사·수능형' },
          { value: 'school', label: '학교 지필' },
        ]}
      />
      {tab === 'mock' ? <MockTab /> : <SchoolTab />}
    </>
  )
}
