import { useState } from 'react'
import { ChevronRight, GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useNow } from '../../app/useNow'
import { useRun } from '../../app/useRun'
import { Badge, DDayBadge, SubjectLabel } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { Segmented, Select } from '../../components/ui/Form'
import { Card, EmptyState, PageHeader, ProgressBar } from '../../components/ui/Layout'
import { scopeProgress } from '../../domain/logic'
import { dDay, formatDay, formatShortDay } from '../../domain/time'
import type { MockExam, MockScores, SchoolExam } from '../../domain/types'
import { AttemptModal } from './AttemptModal'
import { AttemptCreate, MockExamEditor, SchoolExamEditor } from './ExamEditors'
import { ConfirmDialog } from '../../components/ui/Modal'
import { ScoreChart } from './ScoreChart'

type Tab = 'mock' | 'school'
type AttemptFilter = 'first' | 'all' | 'retake'
type Metric = keyof MockScores

const METRIC_LABEL: Record<Metric, string> = { raw: '원점수', standard: '표준점수', percentile: '백분위', grade: '등급' }

function MockTab({ onAdd }: { onAdd: () => void }) {
  const { data, subject, subjectName, actions } = useAppData()
  const { run, error } = useRun()
  const [editing, setEditing] = useState<MockExam | null>(null)
  const [adding, setAdding] = useState<MockExam | null>(null)
  const [deleting, setDeleting] = useState<MockExam | null>(null)
  const [filter, setFilter] = useState<AttemptFilter>('first') // 기본 통계는 첫 응시만 (Q23)
  const [metric, setMetric] = useState<Metric>('raw')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [open, setOpen] = useState<{ examId: string; attemptId: string } | null>(null)

  const exams = data.mockExams.filter((e) => !subjectFilter || e.subjectId === subjectFilter)
  const attempts = exams
    .flatMap((e) => e.attempts.map((a) => ({ e, a })))
    .filter(({ a }) => (filter === 'first' ? a.attemptNo === 1 : filter === 'retake' ? a.attemptNo > 1 : true))
    .sort((x, y) => x.a.solvedDate.localeCompare(y.a.solvedDate))
  const usedSubjects = [...new Set(data.mockExams.map((e) => e.subjectId))]

  if (data.mockExams.length === 0)
    return (
      <Card>
        <EmptyState
          icon={<GraduationCap className="size-6" />}
          title="모의고사 기록이 없습니다"
          description="시험을 과목별로 등록하고 응시 회차마다 성적과 오답을 기록합니다."
          action={
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={onAdd}>
              모의고사 추가
            </Button>
          }
        />
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
          <Card
            key={e.id}
            title={`${e.year}년 ${e.month}월 ${e.org}`}
            action={
              <span className="flex items-center gap-1">
                <SubjectLabel subject={subject(e.subjectId)} />
                <IconButton size="sm" label="시험 정보 수정" onClick={() => setEditing(e)}>
                  <Pencil className="size-3.5" />
                </IconButton>
                <IconButton size="sm" label="시험 삭제" onClick={() => setDeleting(e)}>
                  <Trash2 className="size-3.5" />
                </IconButton>
              </span>
            }
          >
            {e.attempts.length === 0 && <p className="text-sm text-faint">아직 응시 기록이 없습니다.</p>}
            <ul className="-mx-2">
              {e.attempts.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => setOpen({ examId: e.id, attemptId: a.id })} className="flex min-h-10 w-full items-center gap-3 rounded-md px-2 text-left hover:bg-subtle">
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
            <Button size="sm" variant="ghost" className="mt-1" icon={<Plus className="size-4" />} onClick={() => setAdding(e)}>
              {e.attempts.length ? '재응시 추가' : '응시 추가'}
            </Button>
          </Card>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {open && <AttemptModal key={open.attemptId} examId={open.examId} attemptId={open.attemptId} onClose={() => setOpen(null)} />}
      {editing && <MockExamEditor exam={editing} onClose={() => setEditing(null)} />}
      {adding && <AttemptCreate exam={adding} onClose={() => setAdding(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="모의고사를 휴지통으로 이동할까요?"
        tone="danger"
        confirmLabel="휴지통으로 이동"
        onConfirm={() => {
          if (deleting) run(() => actions.removeMockExam(deleting.id))
          setDeleting(null)
        }}
      >
        <p>모든 응시 회차의 점수·오답 기록이 함께 30일 휴지통으로 이동합니다.</p>
      </ConfirmDialog>
    </div>
  )
}

function SchoolTab({ onAdd, onEdit }: { onAdd: () => void; onEdit: (e: SchoolExam) => void }) {
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
        <EmptyState
          icon={<GraduationCap className="size-6" />}
          title="지필 시험 기록이 없습니다"
          description="중간·기말고사의 시험일, 범위, 원점수와 등급을 기록합니다."
          action={
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={onAdd}>
              지필 시험 추가
            </Button>
          }
        />
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
                <button type="button" onClick={() => onEdit(e)} className="flex w-full items-start justify-between gap-2 text-left">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {subjectName(e.subjectId)} {e.term === 'midterm' ? '중간고사' : '기말고사'}
                    </p>
                    <p className="text-sm text-muted">{formatDay(e.date)}</p>
                  </div>
                  <DDayBadge dday={dDay(e.date, now)} />
                </button>
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
            <li key={e.id} className="flex min-h-10 cursor-pointer items-center gap-3 px-4 hover:bg-subtle md:px-5" onClick={() => onEdit(e)}>
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
  const [mockNew, setMockNew] = useState(false)
  const [schoolEdit, setSchoolEdit] = useState<{ exam: SchoolExam | null } | null>(null)
  const add = () => (tab === 'mock' ? setMockNew(true) : setSchoolEdit({ exam: null }))
  return (
    <>
      <PageHeader
        title="시험·성적"
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={add}>
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
      {tab === 'mock' ? <MockTab onAdd={add} /> : <SchoolTab onAdd={add} onEdit={(e) => setSchoolEdit({ exam: e })} />}
      {mockNew && <MockExamEditor exam={null} onClose={() => setMockNew(false)} />}
      {schoolEdit && <SchoolExamEditor key={schoolEdit.exam?.id ?? 'new'} exam={schoolEdit.exam} onClose={() => setSchoolEdit(null)} />}
    </>
  )
}
