import { useCallback, useState } from 'react'

/** 저장 동작 실행 + 진행 중 상태 + 실패 메시지(서버 규칙 위반 등) */
export function useRun() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (fn: () => Promise<unknown> | unknown): Promise<boolean> => {
    setPending(true)
    setError(null)
    try {
      await fn()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다.')
      return false
    } finally {
      setPending(false)
    }
  }, [])

  return { run, pending, error, clearError: () => setError(null) }
}
