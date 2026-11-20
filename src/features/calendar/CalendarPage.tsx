import { useState } from 'react'
import { CalendarPlus, ChevronLeft, ChevronRight, Plus, Repeat } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useNow } from '../../app/useNow'
import { Badge, SubjectDot } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { ChipToggle, Field, Segmented, TextInput } from '../../components/ui/Form'
import { Card, EmptyState, PageHeader, PrototypeNotice } from '../../components/ui/Layout'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { addDays, formatDay, formatShortDay, formatTime, mondayOf, studyDayOf, studyDayStartMs, weekdayLabel } from '../../domain/time'
import type { TimeBlock } from '../../domain/types'
import { AGENDA_LABEL, agendaForDay, type AgendaItem } from '../shared/agenda'
import { BlockEditor } from './BlockEditor'
import { DayTimeline } from './DayTimeline'

type View = 'day' | 'week'
type Scope = 'this' | 'following' | 'all'

export default function CalendarPage() {
  const now = useNow()
  const { data, subject, subjectName } = useAppData()
  const [view, setView] = useState<View>('day') // 기본 일간 보기 (Q152)
  const [day, setDay] = useState(() => studyDayOf(Date.now()))
  // UI 프로토타입: 블록 편집은 화면 상태에만 반영
  const [blocks, setBlocks] = useState<TimeBlock[]>(data.blocks)
  const [editing, setEditing] = useState<{ block: TimeBlock | null } | null>(null)
  const [eventOpen, setEventOpen] = useState<AgendaItem | null>(null)
  const [scope, setScope] = useState<Scope>('this')
  const [deleteTarget, setDeleteTarget] = useState<TimeBlock | null>(null)
  const [newEvent, setNewEvent] = useState(false)
  const [repeatDays, setRepeatDays] = useState<number[]>([])

  const dayStart = studyDayStartMs(day)
  const dayBlocks = blocks.filter((b) => Date.parse(b.start) >= dayStart && Date.parse(b.start) < dayStart + 86_400_000)
  const otherItems = agendaForDay(data, day, subjectName).filter((a) => a.kind !== 'plan')
  const today = studyDayOf(now)
  const empty = dayBlocks.length === 0 && otherItems.length === 0

  const step = view === 'day' ? 1 : 7
  const week = Array.from({ length: 7 }, (_, i) => addDays(mondayOf(day), i))

  return (
    <>
      <PageHeader
        title="캘린더"
        actions={
          <>
            <Button icon={<CalendarPlus className="size-4" />} onClick={() => setNewEvent(true)}>
              일정
            </Button>
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing({ block: null })}>
              학습 계획
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <IconButton label="이전" onClick={() => setDay(addDays(day, -step))}>
            <ChevronLeft className="size-5" />
          </IconButton>
          <p className="min-w-40 text-center font-semibold">
            {view === 'day' ? formatDay(day) : `${formatShortDay(week[0])} – ${formatShortDay(week[6])}`}
          </p>
          <IconButton label="다음" onClick={() => setDay(addDays(day, step))}>
            <ChevronRight className="size-5" />
          </IconButton>
          {day !== today && (
            <Button size="sm" variant="ghost" onClick={() => setDay(today)}>
              오늘
            </Button>
          )}
        </div>
        <Segmented
          label="보기"
          value={view}
          onChange={setView}
          options={[
            { value: 'day', label: '일간' },
            { value: 'week', label: '주간' },
          ]}
        />
      </div>

      {view === 'day' ? (
        <>
          {empty && (
            <Card className="mb-4">
              <EmptyState
                compact
                icon={<CalendarPlus className="size-6" />}
                title="이 날의 계획과 일정이 없습니다"
                description="학습 계획을 추가하면 타임라인에서 끌어서 시간을 옮길 수 있습니다."
                action={
                  <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing({ block: null })}>
                    학습 계획 추가
                  </Button>
                }
              />
            </Card>
          )}
          <p className="mb-2 text-xs text-muted">학습일은 05:00에 시작합니다. 손잡이(⋮⋮)를 끌어 이동하고, 아래 가장자리를 끌어 길이를 바꿉니다.</p>
          <DayTimeline
            day={day}
            blocks={dayBlocks}
            events={otherItems}
            nowMs={now}
            onBlocksChange={(changed) => setBlocks((all) => all.map((b) => changed.find((c) => c.id === b.id) ?? b))}
            onOpenBlock={(b) => setEditing({ block: b })}
            onOpenEvent={(e) => {
              setScope('this')
              setEventOpen(e)
            }}
          />
          <div className="mt-3">
            <PrototypeNotice>드래그·편집 결과는 화면에만 반영되고 저장되지 않습니다.</PrototypeNotice>
          </div>
        </>
      ) : (
        <div className="grid gap-px overflow-hidden rounded-lg bg-line shadow-panel sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {week.map((d) => {
            const items = [
              ...blocks
                .filter((b) => studyDayOf(b.start) === d)
                .map((b) => ({ id: b.id, kind: 'plan' as const, title: subjectName(b.subjectId), start: b.start, end: b.end, subjectId: b.subjectId })),
              ...agendaForDay(data, d, subjectName).filter((a) => a.kind !== 'plan' && a.kind !== 'school'),
            ].sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDay(d)
                  setView('day')
                }}
                className={`min-h-24 bg-surface p-3 text-left hover:bg-subtle ${d === today ? 'shadow-[inset_0_2px_0_var(--accent)]' : ''}`}
              >
                <p className={`mb-2 text-sm font-semibold ${d === today ? 'text-accent' : ''}`}>
                  {weekdayLabel(d)} {formatShortDay(d)}
                </p>
                {items.length === 0 ? (
                  <p className="text-xs text-faint">없음</p>
                ) : (
                  <ul className="space-y-1">
                    {items.map((it) => (
                      <li key={it.id} className="flex items-center gap-1.5 text-xs">
                        <SubjectDot color={subject(it.subjectId)?.color} />
                        <span className="tabular text-muted">{formatTime(it.start)}</span>
                        <span className="truncate">{it.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </button>
            )
          })}
          <p className="bg-surface px-3 py-2 text-xs text-muted sm:col-span-2 lg:col-span-4 xl:col-span-7">주간 보기에는 학교 정규 수업을 생략합니다. 날짜를 누르면 일간 보기로 이동합니다.</p>
        </div>
      )}

      {editing && (
        <BlockEditor
          key={editing.block?.id ?? 'new'}
          open
          block={editing.block}
          day={day}
          others={blocks}
          onClose={() => setEditing(null)}
          onSave={(b) => {
            setBlocks((all) => (all.some((x) => x.id === b.id) ? all.map((x) => (x.id === b.id ? b : x)) : [...all, b]))
            setEditing(null)
          }}
          onDelete={(b) => {
            setEditing(null)
            setDeleteTarget(b)
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="학습 계획을 휴지통으로 이동할까요?"
        confirmLabel="휴지통으로 이동"
        tone="danger"
        onConfirm={() => {
          setBlocks((all) => all.filter((b) => b.id !== deleteTarget?.id))
          setDeleteTarget(null)
        }}
      >
        <p>계획만 30일 휴지통으로 이동합니다. 이 계획에서 시작한 실제 공부 기록은 그대로 유지됩니다.</p>
      </ConfirmDialog>

      <Modal
        open={newEvent}
        onClose={() => setNewEvent(false)}
        title="일정 추가"
        footer={
          <>
            <Button onClick={() => setNewEvent(false)}>취소</Button>
            <Button variant="primary" disabled title="2단계에서 연결">
              저장
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="제목" required>
            {(id) => <TextInput id={id} placeholder="예: 진로 상담" />}
          </Field>
          <Field label="날짜" required>
            {(id) => <TextInput id={id} type="date" defaultValue={day} />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="시작" required>
              {(id) => <TextInput id={id} type="time" defaultValue="16:00" />}
            </Field>
            <Field label="종료" required>
              {(id) => <TextInput id={id} type="time" defaultValue="17:00" />}
            </Field>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">매주 반복 (선택)</p>
            <div className="flex flex-wrap gap-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((w, i) => (
                <ChipToggle key={w} selected={repeatDays.includes(i)} onClick={() => setRepeatDays((r) => (r.includes(i) ? r.filter((x) => x !== i) : [...r, i]))}>
                  {w}
                </ChipToggle>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted">특정 날짜의 학교 예외 수업도 여기서 일정으로 추가합니다(정규 시간표는 바뀌지 않음).</p>
          <PrototypeNotice />
        </div>
      </Modal>

      {/* 일정 상세: 반복 일정 수정 범위 선택(Q131), 삭제는 한 회차만(Q142) */}
      <Modal
        open={!!eventOpen}
        onClose={() => setEventOpen(null)}
        title={eventOpen?.title ?? ''}
        footer={
          eventOpen?.kind === 'personal' ? (
            <>
              <Button variant="ghost" className="mr-auto text-danger">
                {eventOpen.recurring ? '이 회차만 삭제' : '삭제'}
              </Button>
              <Button variant="primary">수정</Button>
            </>
          ) : undefined
        }
      >
        {eventOpen && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge>{AGENDA_LABEL[eventOpen.kind]}</Badge>
              <span className="tabular">
                {formatDay(studyDayOf(eventOpen.start))} {formatTime(eventOpen.start)}–{formatTime(eventOpen.end)}
              </span>
              {eventOpen.recurring && (
                <Badge>
                  <Repeat className="size-3" /> 반복
                </Badge>
              )}
              {eventOpen.note && <Badge tone="warning">{eventOpen.note}</Badge>}
            </div>
            {eventOpen.kind === 'school' && <p className="text-sm text-muted">학교 정규 수업은 학교 시간표에서 관리하며 학습 시간 통계에 포함되지 않습니다.</p>}
            {eventOpen.kind === 'academy' && <p className="text-sm text-muted">출석·휴강·보강은 학원 화면에서 관리합니다.</p>}
            {eventOpen.kind === 'personal' && eventOpen.recurring && (
              <fieldset>
                <legend className="mb-2 text-sm font-medium">수정 범위</legend>
                <Segmented
                  label="수정 범위"
                  value={scope}
                  onChange={setScope}
                  options={[
                    { value: 'this', label: '이번만' },
                    { value: 'following', label: '이번 및 이후' },
                    { value: 'all', label: '전체' },
                  ]}
                />
                <p className="mt-2 text-xs text-muted">삭제는 선택한 회차 하나에만 적용됩니다.</p>
              </fieldset>
            )}
            <PrototypeNotice />
          </div>
        )}
      </Modal>
    </>
  )
}
