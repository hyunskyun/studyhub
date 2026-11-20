import { useState } from 'react'
import { CalendarX2, Pencil, Plus, School } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { Badge, SubjectLabel, type Tone } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { cn } from '../../components/ui/cn'
import { CheckButton, Field, Segmented, TextInput } from '../../components/ui/Form'
import { Card, EmptyState, PageHeader, PrototypeNotice } from '../../components/ui/Layout'
import { Modal } from '../../components/ui/Modal'
import { formatDay, formatShortDay, formatTime } from '../../domain/time'
import type { AcademyClass, ClassStatus, HomeworkWeek } from '../../domain/types'

const WD = ['일', '월', '화', '수', '목', '금', '토']
const STATUS: Record<ClassStatus, { label: string; tone: Tone }> = {
  scheduled: { label: '예정', tone: 'neutral' },
  attended: { label: '출석', tone: 'success' },
  absent: { label: '결석', tone: 'danger' },
  cancelled: { label: '휴강', tone: 'warning' },
  makeup: { label: '보강', tone: 'accent' },
}

type Tab = 'classes' | 'homework' | 'courses'

export default function AcademyPage() {
  const { data, subject } = useAppData()
  const [tab, setTab] = useState<Tab>('classes')
  const [classes, setClasses] = useState<AcademyClass[]>(data.classes)
  const [weeks, setWeeks] = useState<HomeworkWeek[]>(data.homeworkWeeks)
  const [attendance, setAttendance] = useState<AcademyClass | null>(null)

  const course = (id: string) => data.courses.find((c) => c.id === id)
  const academy = (id?: string) => data.academies.find((a) => a.id === id)

  if (data.courses.length === 0)
    return (
      <>
        <PageHeader title="학원" actions={<Button variant="primary" icon={<Plus className="size-4" />}>강좌 추가</Button>} />
        <Card>
          <EmptyState icon={<School className="size-6" />} title="등록된 학원 강좌가 없습니다" description="정기 수업 요일·시각과 주간 숙제 템플릿을 등록하면 주차별 숙제가 수업 일정에 맞춰 만들어집니다." />
        </Card>
      </>
    )

  return (
    <>
      <PageHeader title="학원" actions={<Button variant="primary" icon={<Plus className="size-4" />}>강좌 추가</Button>} />
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

      {tab === 'classes' && (
        <Card padded={false}>
          <ul className="divide-y divide-line">
            {[...classes]
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((c) => {
                const co = course(c.courseId)
                return (
                  <li key={c.id} className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 md:px-5">
                    <span className="w-28 shrink-0">
                      <span className="block text-sm font-medium">{formatDay(c.date)}</span>
                      <span className={cn('tabular text-xs text-muted', c.status === 'cancelled' && 'line-through')}>
                        {formatTime(c.start)}–{formatTime(c.end)}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{co?.title}</span>
                      <span className="text-xs text-muted">{academy(co?.academyId)?.name}</span>
                    </span>
                    <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                    {c.status !== 'cancelled' && (
                      <Button size="sm" onClick={() => setAttendance(c)}>
                        출석 기록
                      </Button>
                    )}
                  </li>
                )
              })}
          </ul>
          <p className="border-t border-line px-4 py-3 text-xs text-muted md:px-5">
            출석을 확인한 수업만 학원 시간으로 집계됩니다. 학원 시간은 통계에 포함되지만 자습 시간 목표에는 들어가지 않습니다.
          </p>
        </Card>
      )}

      {tab === 'homework' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {weeks.length === 0 && (
            <Card className="lg:col-span-2">
              <EmptyState compact title="이번 주 숙제가 없습니다" description="수업이 없는 주에는 숙제가 새로 만들어지지 않습니다." />
            </Card>
          )}
          {weeks.map((w) => {
            const co = course(w.courseId)
            return (
              <Card key={w.id} title={co?.title} action={<span className="text-sm text-muted">{formatShortDay(w.weekOf)} 주 · 마감 {formatDay(w.due)}</span>}>
                <ul>
                  {w.items.map((it) => (
                    <li key={it.id} className="flex min-h-9 items-center gap-2">
                      <CheckButton
                        checked={it.done}
                        label={`${it.title} 완료`}
                        onChange={(v) => setWeeks((all) => all.map((x) => (x.id === w.id ? { ...x, items: x.items.map((y) => (y.id === it.id ? { ...y, done: v } : y)) } : x)))}
                      />
                      <span className={cn('min-w-0 flex-1 text-sm', it.done && 'text-muted line-through')}>{it.title}</span>
                      {it.overridden && (
                        <Badge>
                          <Pencil className="size-3" /> 이번 주만 수정
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">마감은 다음 실제 수업일입니다. 이 주차에서 고친 내용은 템플릿에 영향을 주지 않습니다.</p>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'courses' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.courses.map((co) => (
            <Card key={co.id} title={co.title} action={<SubjectLabel subject={subject(co.subjectId)} />}>
              <p className="text-sm text-muted">
                {academy(co.academyId)?.name}
                {co.teacher && ` · ${co.teacher}`}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {co.slots.map((s, i) => (
                  <li key={i}>
                    <Badge>
                      {WD[s.weekday]} {s.start}–{s.end}
                    </Badge>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <p className="mb-1 text-sm font-medium">주간 숙제 템플릿</p>
                <ul className="list-disc space-y-0.5 pl-5 text-sm">
                  {co.homeworkTemplate.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">템플릿을 바꾸면 미래 주차의 미완료 숙제도 바뀝니다. 주차에서 직접 고친 항목과 완료한 숙제는 유지됩니다.</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" icon={<Pencil className="size-4" />}>
                  템플릿 편집
                </Button>
                <Button size="sm" icon={<CalendarX2 className="size-4" />}>
                  휴강·보강 등록
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4">
        <PrototypeNotice />
      </div>

      {/* 출석: 여부만 기록, 예정 시각을 불러와 실제 시간 수정 (Q41–42, Q107) */}
      <Modal
        open={!!attendance}
        onClose={() => setAttendance(null)}
        title="출석 기록"
        footer={
          <>
            <Button
              onClick={() => {
                setClasses((all) => all.map((c) => (c.id === attendance?.id ? { ...c, status: 'absent' } : c)))
                setAttendance(null)
              }}
            >
              결석
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setClasses((all) => all.map((c) => (c.id === attendance?.id ? { ...c, status: c.status === 'makeup' ? 'makeup' : 'attended' } : c)))
                setAttendance(null)
              }}
            >
              출석
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
              <Field label="실제 시작">{(id) => <TextInput id={id} type="time" defaultValue={formatTime(attendance.start)} />}</Field>
              <Field label="실제 종료">{(id) => <TextInput id={id} type="time" defaultValue={formatTime(attendance.end)} />}</Field>
            </div>
            <p className="text-xs text-muted">예정 시각을 불러왔습니다. 실제와 다르면 수정하세요.</p>
          </div>
        )}
      </Modal>
    </>
  )
}
