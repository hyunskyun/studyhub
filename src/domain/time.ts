// 학습일·시간 계산 순수 함수 (Asia/Seoul, 학습일 경계 05:00 고정: Q52, Q156)
// KST는 서머타임이 없으므로 고정 오프셋(+9h)으로 계산한다.

const HOUR = 3_600_000
const DAY = 24 * HOUR
const KST_OFFSET = 9 * HOUR
export const STUDY_DAY_BOUNDARY_HOUR = 5

/** 'YYYY-MM-DD' 형식의 날짜 문자열 */
export type DateStr = string

function toMs(t: number | string | Date): number {
  return typeof t === 'number' ? t : new Date(t).getTime()
}

/** KST 달력 날짜 */
export function kstDateOf(t: number | string | Date): DateStr {
  return new Date(toMs(t) + KST_OFFSET).toISOString().slice(0, 10)
}

/** 학습일: KST 05:00 이전은 전날 학습일로 귀속 (Q52–53) */
export function studyDayOf(t: number | string | Date): DateStr {
  return new Date(toMs(t) + KST_OFFSET - STUDY_DAY_BOUNDARY_HOUR * HOUR)
    .toISOString()
    .slice(0, 10)
}

/** 학습일 시작 시각(해당 날짜 05:00 KST)의 epoch ms */
export function studyDayStartMs(day: DateStr): number {
  return Date.parse(`${day}T00:00:00Z`) - KST_OFFSET + STUDY_DAY_BOUNDARY_HOUR * HOUR
}

/** 날짜 + 'HH:MM' → KST 오프셋이 붙은 ISO 문자열 */
export function kstDateTime(day: DateStr, hhmm: string): string {
  return `${day}T${hhmm}:00+09:00`
}

export function addDays(day: DateStr, n: number): DateStr {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10)
}

export function daysBetween(from: DateStr, to: DateStr): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY)
}

/** 0=일 … 6=토 */
export function weekdayOf(day: DateStr): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay()
}

/** 해당 날짜가 속한 주의 월요일 */
export function mondayOf(day: DateStr): DateStr {
  const w = weekdayOf(day)
  return addDays(day, w === 0 ? -6 : 1 - w)
}

/**
 * D-Day: 05:00 경계 학습일 기준 (Q54–55). 남은 시간은 표시하지 않는다.
 * target이 날짜만 있으면 그 날짜, 시각이 있으면 그 시각의 학습일을 사용.
 */
export function dDay(target: DateStr | string, now: number): number {
  const targetDay = target.length === 10 ? target : studyDayOf(target)
  return daysBetween(studyDayOf(now), targetDay)
}

export function formatDDay(n: number): string {
  if (n === 0) return 'D-Day'
  return n > 0 ? `D-${n}` : `D+${-n}`
}

export interface Due {
  date: DateStr
  /** 'HH:MM' (선택) */
  time?: string
}

/** 기한 초과: 날짜만 있으면 마감일 다음 날 05:00부터 (Q56–57) */
export function isOverdue(due: Due, now: number): boolean {
  if (due.time) return now > Date.parse(kstDateTime(due.date, due.time))
  return now >= studyDayStartMs(addDays(due.date, 1))
}

export function minutesBetween(start: string, end: string): number {
  return Math.max(0, Math.round((toMs(end) - toMs(start)) / 60_000))
}

/** 하나의 구간을 학습일별 분 단위로 분할 (원본 시각은 보존: Q52) */
export function splitMinutesByStudyDay(start: string, end: string): Record<DateStr, number> {
  const out: Record<DateStr, number> = {}
  let cur = toMs(start)
  const stop = toMs(end)
  while (cur < stop) {
    const day = studyDayOf(cur)
    const next = Math.min(stop, studyDayStartMs(addDays(day, 1)))
    out[day] = (out[day] ?? 0) + Math.round((next - cur) / 60_000)
    cur = next
  }
  return out
}

/** 반열린 구간 [aStart, aEnd) 과 [bStart, bEnd) 의 겹침 여부 */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMs(aStart) < toMs(bEnd) && toMs(bStart) < toMs(aEnd)
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function weekdayLabel(day: DateStr): string {
  return WEEKDAYS[weekdayOf(day)]
}

export function formatDay(day: DateStr, withYear = false): string {
  const [y, m, d] = day.split('-').map(Number)
  return `${withYear ? `${y}년 ` : ''}${m}월 ${d}일 (${weekdayLabel(day)})`
}

export function formatShortDay(day: DateStr): string {
  const [, m, d] = day.split('-').map(Number)
  return `${m}/${d}`
}

/** ISO → 'HH:MM' (KST) */
export function formatTime(iso: string): string {
  return new Date(toMs(iso) + KST_OFFSET).toISOString().slice(11, 16)
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}분`
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const hh = String(Math.floor(s / 3600)).padStart(2, '0')
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

/** 학습일 05:00부터 경과한 분 (캘린더 타임라인 위치 계산용) */
export function minutesFromStudyDayStart(iso: string, day: DateStr): number {
  return Math.round((toMs(iso) - studyDayStartMs(day)) / 60_000)
}
