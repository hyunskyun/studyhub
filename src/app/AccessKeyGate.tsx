import { useState } from 'react'
import { GraduationCap, KeyRound } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Field, TextInput } from '../components/ui/Form'
import { useAppData } from './data-context'

/** 개인 접근 키 입력: 기기마다 처음 한 번 */
export function AccessKeyGate() {
  const { setAccessKey, loadError, hasAccessKey, setFixture } = useAppData()
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)

  return (
    <div className="flex min-h-svh items-center justify-center bg-bg px-4">
      <form
        className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-panel"
        onSubmit={(e) => {
          e.preventDefault()
          if (key.trim()) setAccessKey(key.trim())
        }}
      >
        <div className="mb-5 flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-accent-soft text-accent">
            <GraduationCap className="size-4" />
          </span>
          <span className="text-lg">학업 플래너</span>
        </div>
        <p className="mb-4 text-sm text-muted">이 기기에서 처음 사용합니다. 개인 접근 키를 입력하세요. 한 번 입력하면 이 기기에 기억됩니다.</p>
        <Field label="개인 접근 키" error={hasAccessKey ? loadError : undefined}>
          {(id, d) => (
            <TextInput
              id={id}
              aria-describedby={d}
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              autoCapitalize="off"
              spellCheck={false}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              invalid={hasAccessKey && !!loadError}
            />
          )}
        </Field>
        <label className="mt-2 flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> 키 보이기
        </label>
        <Button type="submit" variant="primary" className="mt-4 w-full" icon={<KeyRound className="size-4" />} disabled={!key.trim()}>
          확인
        </Button>
        {import.meta.env.DEV && (
          <button type="button" className="mt-4 w-full text-center text-xs text-muted underline" onClick={() => setFixture(true)}>
            개발용 fixture 데이터로 보기
          </button>
        )}
      </form>
    </div>
  )
}
