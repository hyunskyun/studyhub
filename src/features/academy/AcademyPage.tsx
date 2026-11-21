import { useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, School, X } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useNow } from '../../app/useNow'
import { useRun } from '../../app/useRun'
import { Badge, SubjectLabel, type Tone } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { cn } from '../../components/ui/cn'
import { CheckButton, Field, Segmented, Select, TextInput } from '../../components/ui/Form'
import { Card, EmptyState, PageHeader } from '../../components/ui/Layout'
import { Modal } from '../../components/ui/Modal'
import { courseOccurrences } from '../../domain/academy'
import { addDays, formatDay, formatShortDay, formatTime, kstDateTime, mondayOf, studyDayOf } from '../../domain/time'
import type { AcademyClass, ClassStatus, Course, HomeworkWeek } from '../../domain/types'
import { CourseEditor } from './CourseEditor'

const WD = ['일', '월', '화', '수', '목', '금', '토']
const STATUS: Record<ClassStatus, { label: string; tone: Tone }> = {
  scheduled: { label: '예정', tone: 'neutral' },
  attended: { label: '출석', tone: 'success' },
  absent: { label: '결석', tone: 'danger' },
  cancelled: { label: '휴강', tone: 'warning' },
  makeup: { label: '보강', tone: 'accent' },
}

type Tab = 'classes' | 'homework' | 'courses'

function HomeworkCard({ w }: { w: HomeworkWeek }) {
  const { data, actions } = useAppData()
  const { run, pending, error } = useRun()
  const [editing, setEditing] = useState<string | null>(null)
  const [text, setText] = useState('')
  const course = data.courses.find((c) => c.id === w.courseId)
  return (
    <Card title={course?.title ?? w.courseTitle ?? '삭제된 강좌'} action={<span className="text-sm text-muted">{formatShortDay(w.weekOf)} 주 · 마감 {formatDay(w.due)}</span>}>
      <ul className="divide-y divide-line">
        {w.items.map((it) => (
          <li key={it.id} className="flex min-h-10 items-center gap-2">
            <CheckButton checked={it.done} label={`${it.title} 완료`} disabled={pending} onChange={() => run(() => actions.toggleHomeworkItem(w.id, it.id))} />
            {editing === it.id ? (
              <form
                className="flex flex-1 items-center gap-1"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (text.trim() && (await run(() => actions.editHomeworkItem(w.id, it.id, text)))) setEditing(null)
                }}
              >
                <TextInput aria-label="숙제 내용" value={text} onChange={(e) => setText(e.target.value)} className="h-8" autoFocus />
                <IconButton size="sm" label="저장" type="submit">
                  <Check className="size-4" />
                </IconButton>
                <IconButton size="sm" label="취소" onClick={() => setEditing(null)}>
                  <X className="size-4" />
                </IconButton>
              </form>
            ) : (
              <>
                <span className={cn('min-w-0 flex-1 text-sm', it.done && 'text-muted line-through')}>{it.title}</span>
                {it.overridden && <Badge>이번 주만 수정</Badge>}
                {course && (
                  <IconButton
                    size="sm"
                    label={`${it.title} 이번 주만 수정`}
                    onClick={() => {
                      setText(it.title)
                      setEditing(it.id)
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </IconButton>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">마감은 다음 실제 수업일이며 휴강이 생기면 자동으로 밀립니다. 이 주에서 고친 내용은 템플릿에 영향을 주지 않습니다.</p>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </Card>
  )
}

export default function AcademyPage() {
  const now = useNow()
  const { data, subject, actions } = useAppData()
  const { run, pending, error } = useRun()
  const [tab, setTab] = useState<Tab>('classes')
  const [weekShift, setWeekShift] = useState(0)
  const [editor, setEditor] = useState<{ course: Course | null } | null>(null)
  const [attendance, setAttendance] = useState<AcademyClass | null>(null)
  const [actual, setActual] = useState({ start: '', end: '' })
  const [makeup, setMakeup] = useState<{ courseId: string; date: string; start: string; end: string } | null>(null)

  const today = studyDayOf(now)
  const thisWeek = mondayOf(today)
  const weekStart = addDays(thisWeek, weekShift * 7)
  const occurrences = courseOccurrences(data.courses, data.classes, weekStart, addDays(weekStart, 6))
  const course = (id: string) => data.courses.find((c) => c.id === id)
  const academy = (id?: string) => data.academies.find((a) => a.id === id)
  const weeks = data.homeworkWeeks
    .filter((w) => w.weekOf === thisWeek || w.items.some((i) => !i.done))
    .sort((a, b) => b.weekOf.localeCompare(a.weekOf))

  // 이번 주 숙제 묶음 자동 생성 (수업이 있는 강좌만: Q37, Q137)
  const synced = useRef('')
  useEffect(() => {
    const key = `${thisWeek}:${data.courses.map((c) => c.id).join(',')}`
    if (synced.current === key || data.courses.length === 0) return
    synced.current = key
    actions.syncHomework(thisWeek).catch(() => {})
  }, [thisWeek, data.courses, actions])

  const headerActions = (
    <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditor({ course: null })}>
      강좌 추가
    </Button>
  )

  if (data.courses.length === 0)
    return (
      <>
        <PageHeader title="학원" actions={headerActions} />
        <Card>
          <EmptyState
            icon={<School className="size-6" />}
            title="등록된 학원 강좌가 없습니다"
            description="정기 수업 요일·시각과 주간 숙제 템플릿을 등록하면 주차별 숙제가 수업 일정에 맞춰 만들어집니다."
            action={headerActions}
          />
        </Card>
        {editor && <CourseEditor course={editor.course} onClose={() => setEditor(null)} />}
      </>
    )

  const setStatus = (c: AcademyClass, status: ClassStatus) => run(() => actions.setClassStatus(c, status))

  return (
    <>
      <PageHeader title="학원" actions={headerActions} />
      <Segmented
        className="mb-4"
        label="학원 보기"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'classes', label: '수업·출석' },
          { value: 'homework', label: '주간 숙제' },
          { value: 'courses', label: '강좌·템플릿' },
        ]}
      />
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {tab === 'classes' && (
        <Card
          padded={false}
          title={
            <span className="flex items-center gap-1">
              <IconButton size="sm" label="이전 주" onClick={() => setWeekShift(weekShift - 1)}>
                <ChevronLeft className="size-4" />
              </IconButton>
              <span className="tabular">
                {formatShortDay(weekStart)} – {formatShortDay(addDays(weekStart, 6))}
              </span>
              <IconButton size="sm" label="다음 주" onClick={() => setWeekShift(weekShift + 1)}>
                <ChevronRight className="size-4" />
              </IconButton>
            </span>
          }
          action={
            <Button size="sm" onClick={() => setMakeup({ courseId: data.courses[0].id, date: today, start: '18:00', end: '20:00' })}>
              보강 추가
            </Button>
          }
        >
          {occurrences.length === 0 ? (
            <EmptyState compact title="이 주에는 수업이 없습니다" />
          ) : (
            <ul className="divide-y divide-line">
              {occurrences.map((c) => {
                const co = course(c.courseId)
                const st = c.makeup && c.status === 'scheduled' ? STATUS.makeup : STATUS[c.status]
                return (
                  <li key={c.id} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 md:px-5">
                    <span className="w-28 shrink-0">
                      <span className={cn('block text-sm font-medium', c.date === today && 'text-accent')}>{formatDay(c.date)}</span>
                      <span className={cn('tabular text-xs text-muted', c.status === 'cancelled' && 'line-through')}>
                        {formatTime(c.start)}–{formatTime(c.end)}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{co?.title}</span>
                      <span className="text-xs text-muted">{academy(co?.academyId)?.name}</span>
                    </span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                    {c.status === 'scheduled' ? (
                      <span className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => {
                            setActual({ start: formatTime(c.start), end: formatTime(c.end) })
                            setAttendance(c)
                          }}
                        >
                          출석
                        </Button>
                        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setStatus(c, 'absent')}>
                          결석
                        </Button>
                        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setStatus(c, 'cancelled')}>
                          휴강
                        </Button>
                      </span>
                    ) : (
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setStatus(c, 'scheduled')}>
                        되돌리기
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          <p className="border-t border-line px-4 py-3 text-xs text-muted md:px-5">
            출석을 확인한 수업만 학원 시간으로 집계됩니다. 학원 시간은 통계에 포함되지만 자습 시간 목표에는 들어가지 않습니다.
          </p>
        </Card>
      )}

      {tab === 'homework' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {weeks.length === 0 ? (
            <Card className="lg:col-span-2">
              <EmptyState compact title="이번 주 숙제가 없습니다" description="숙제 템플릿이 있는 강좌에 이번 주 수업이 있으면 자동으로 만들어집니다." />
            </Card>
          ) : (
            weeks.map((w) => <HomeworkCard key={w.id} w={w} />)
          )}
        </div>
      )}

      {tab === 'courses' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.courses.map((co) => (
            <Card
              key={co.id}
              title={co.title}
              action={
                <span className="flex items-center gap-1">
                  <SubjectLabel subject={subject(co.subjectId)} />
                  <IconButton size="sm" label="강좌 수정" onClick={() => setEditor({ course: co })}>
                    <Pencil className="size-3.5" />
                  </IconButton>
                </span>
              }
            >
              <p className="text-sm text-muted">
                {academy(co.academyId)?.name}
                {co.teacher && ` · ${co.teacher}`}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {co.slots.map((s, i) => (
                  <li key={i}>
                    <Badge>
                      {WD[s.weekday]} {s.start}–{s.end}
                    </Badge>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <p className="mb-1 text-sm font-medium">주간 숙제 템플릿</p>
                {co.homeworkTemplate.length === 0 ? (
                  <p className="text-sm text-faint">없음</p>
                ) : (
                  <ul className="list-disc space-y-0.5 pl-5 text-sm">
                    {co.homeworkTemplate.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {editor && <CourseEditor key={editor.course?.id ?? 'new'} course={editor.course} onClose={() => setEditor(null)} />}

      {/* 출석: 여부만 기록, 예정 시각을 불러와 실제 시간 수정 (Q41–42, Q107) */}
      <Modal
        open={!!attendance}
        onClose={() => setAttendance(null)}
        title="출석 기록"
        footer={
          <>
            <Button onClick={() => setAttendance(null)}>취소</Button>
            <Button
              variant="primary"
              disabled={pending || !actual.start || !actual.end || actual.end <= actual.start}
              onClick={async () => {
                if (!attendance) return
                const ok = await run(() =>
                  actions.setClassStatus(attendance, 'attended', { start: kstDateTime(attendance.date, actual.start), end: kstDateTime(attendance.date, actual.end) }),
                )
                if (ok) setAttendance(null)
              }}
            >
              출석으로 저장
            </Button>
          </>
        }
      >
        {attendance && (
          <div className="space-y-4">
            <p className="text-sm">
              {course(attendance.courseId)?.title} · {formatDay(attendance.date)}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="실제 시작">{(id) => <TextInput id={id} type="time" value={actual.start} onChange={(e) => setActual({ ...actual, start: e.target.value })} />}</Field>
              <Field label="실제 종료">{(id) => <TextInput id={id} type="time" value={actual.end} onChange={(e) => setActual({ ...actual, end: e.target.value })} />}</Field>
            </div>
            <p className="text-xs text-muted">예정 시각을 불러왔습니다. 실제와 다르면 수정하세요.</p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!makeup}
        onClose={() => setMakeup(null)}
        title="보강 추가"
        footer={
          <>
            <Button onClick={() => setMakeup(null)}>취소</Button>
            <Button
              variant="primary"
              disabled={pending || !makeup || makeup.end <= makeup.start || !makeup.date}
              onClick={async () => {
                if (!makeup) return
                const ok = await run(() => actions.addMakeup(makeup.courseId, makeup.date, kstDateTime(makeup.date, makeup.start), kstDateTime(makeup.date, makeup.end)))
                if (ok) setMakeup(null)
              }}
            >
              추가
            </Button>
          </>
        }
      >
        {makeup && (
          <div className="space-y-4">
            <Field label="강좌">
              {(id) => (
                <Select id={id} value={makeup.courseId} onChange={(e) => setMakeup({ ...makeup, courseId: e.target.value })}>
                  {data.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="날짜">{(id) => <TextInput id={id} type="date" value={makeup.date} onChange={(e) => setMakeup({ ...makeup, date: e.target.value })} />}</Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="시작">{(id) => <TextInput id={id} type="time" value={makeup.start} onChange={(e) => setMakeup({ ...makeup, start: e.target.value })} />}</Field>
              <Field label="종료">{(id) => <TextInput id={id} type="time" value={makeup.end} onChange={(e) => setMakeup({ ...makeup, end: e.target.value })} />}</Field>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
