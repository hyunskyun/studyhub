import { useEffect, useState } from 'react'

/** 주기적으로 갱신되는 현재 시각 (렌더 중 Date.now() 직접 호출 방지) */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
