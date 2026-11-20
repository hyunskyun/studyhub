// 하루 일정 합성: 학습 계획 블록 + 캘린더 일정 + 학원 수업 + 학교 시간표
import { addDays, kstDateTime, studyDayStartMs, weekdayOf, type DateStr } from '../../domain/time'
import type { AppData } from '../../domain/types'

export type AgendaKind = 'plan' | 'school' | 'academy' | 'personal'

export interface AgendaItem {
  id: string
  kind: AgendaKind
  title: string
  start: string
  end: string
  subjectId?: string
  note?: string
  recurring?: boolean
  cancelled?: boolean
}

export const AGENDA_LABEL: Record<AgendaKind, string> = {
  plan: '학습 계획',
  school: '학교',
  academy: '학원',
  personal: '일정',
}

export function agendaForDay(data: AppData, day: DateStr, subjectName: (id?: string) => string): AgendaItem[] {
  const from = studyDayStartMs(day)
  const to = studyDayStartMs(addDays(day, 1))
  const within = (s: string) => {
    const t = Date.parse(s)
    return t >= from && t < to
  }
  const items: AgendaItem[] = []

  for (const b of data.blocks)
    if (within(b.start))
      items.push({ id: b.id, kind: 'plan', title: subjectName(b.subjectId), start: b.start, end: b.end, subjectId: b.subjectId })

  for (const e of data.events) {
    if (within(e.start)) {
      items.push({ id: e.id, kind: e.kind, title: e.title, start: e.start, end: e.end, recurring: !!e.recurrence })
    }
  }

  for (const c of data.classes) {
    if (c.date !== day) continue
    const course = data.courses.find((x) => x.id === c.courseId)
    items.push({
      id: c.id,
      kind: 'academy',
      title: course?.title ?? '학원 수업',
      start: c.start,
      end: c.end,
      subjectId: course?.subjectId,
      note: c.status === 'makeup' ? '보강' : c.status === 'cancelled' ? '휴강' : undefined,
      cancelled: c.status === 'cancelled',
    })
  }

  const wd = weekdayOf(day)
  for (const t of data.timetable)
    if (t.weekday === wd)
      items.push({
        id: `tt-${wd}-${t.period}`,
        kind: 'school',
        title: `${t.period}교시 ${t.subject}`,
        start: kstDateTime(day, t.start),
        end: kstDateTime(day, t.end),
        recurring: true,
      })

  return items.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
}
