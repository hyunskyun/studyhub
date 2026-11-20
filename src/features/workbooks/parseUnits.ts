/** "단원명<TAB 또는 , 또는 공백>개수" 줄 목록을 파싱 (Q90) */
export function parseUnits(text: string) {
  const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  return rows.map((line, i) => {
    const m = line.match(/^(.*?)[\s,\t]+(\d{1,3})$/)
    if (!m || !m[1].trim()) return { line: i + 1, error: `${i + 1}번째 줄: "단원명 개수" 형식이 아닙니다.` as const }
    const count = Number(m[2])
    if (count < 1 || count > 200) return { line: i + 1, error: `${i + 1}번째 줄: Part 개수는 1~200 사이여야 합니다.` as const }
    return { line: i + 1, title: m[1].trim(), count }
  })
}
