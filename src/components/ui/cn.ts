export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

/** 100% 초과 달성률 표기 허용 (Q111) */
export function percentLabel(value: number, max: number) {
  return max > 0 ? `${Math.round((value / max) * 100)}%` : '–'
}
