import { useState } from 'react'
import { Download, FolderOpen, KeyRound, Monitor, Moon, Sun, Upload } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useTheme, type ThemePref } from '../../app/theme-context'
import { Button } from '../../components/ui/Button'
import { cn } from '../../components/ui/cn'
import { Toggle } from '../../components/ui/Form'
import { Card, PageHeader, PrototypeNotice } from '../../components/ui/Layout'
import { ConfirmDialog } from '../../components/ui/Modal'
import { ErrorCausesCard } from './ErrorCausesCard'
import { SubjectsCard } from './SubjectsCard'

const THEMES: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: '라이트', icon: Sun },
  { value: 'dark', label: '다크', icon: Moon },
  { value: 'system', label: '시스템', icon: Monitor },
]

export default function SettingsPage() {
  const { pref, setPref } = useTheme()
  const { mode, setFixture, setAccessKey } = useAppData()
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [forgetOpen, setForgetOpen] = useState(false)

  return (
    <>
      <PageHeader title="설정" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="개인 접근 키">
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted">이 기기에 저장된 키로 서버(Cloudflare D1)에 접근합니다. 다른 기기에서는 처음 한 번 같은 키를 입력하세요.</p>
            <Button icon={<KeyRound className="size-4" />} onClick={() => setForgetOpen(true)} disabled={mode === 'fixture'}>
              이 기기에서 키 지우기
            </Button>
          </div>
        </Card>

        <Card title="Google Drive 권한">
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted">학습 자료 연결에 필요한 Drive 권한은 로그인과 별도로 요청합니다. 선택한 파일만 접근합니다.</p>
            <Button icon={<FolderOpen className="size-4" />} disabled title="5단계에서 연결">
              Drive 권한 부여
            </Button>
          </div>
        </Card>

        <Card title="화면 테마">
          <div role="radiogroup" aria-label="화면 테마" className="inline-flex overflow-hidden rounded-md bg-surface shadow-control">
            {THEMES.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={pref === t.value}
                  onClick={() => setPref(t.value)}
                  className={cn(
                    'flex h-9 items-center gap-1.5 border-l border-line px-3.5 text-sm transition-colors first:border-l-0',
                    pref === t.value ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-subtle hover:text-fg',
                  )}
                >
                  <Icon className="size-3.5" />
                  {t.label}
                </button>
              )
            })}
          </div>
        </Card>

        <SubjectsCard />

        <ErrorCausesCard />

        <Card title="백업·복원">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button icon={<Download className="size-4" />} disabled>
                JSON 전체 백업
              </Button>
              <Button icon={<Download className="size-4" />} disabled>
                CSV 학습 기록
              </Button>
              <Button icon={<Upload className="size-4" />} onClick={() => setRestoreOpen(true)}>
                JSON 복원
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-muted">JSON에는 앱 데이터 전체가 들어가며 로그인 정보는 포함되지 않습니다. CSV는 학습 기록과 통계 전체를 내보냅니다.</p>
            <PrototypeNotice>백업·복원은 5단계에서 연결됩니다.</PrototypeNotice>
          </div>
        </Card>

        {import.meta.env.DEV && (
          <Card title="개발 도구" className="lg:col-span-2">
            <Toggle
              label="디자인 검수용 fixture 데이터"
              description="개발 모드에서만 보이며 실제 사용자 데이터로 저장되지 않습니다."
              checked={mode === 'fixture'}
              onChange={setFixture}
            />
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={forgetOpen}
        onClose={() => setForgetOpen(false)}
        title="이 기기에서 접근 키를 지울까요?"
        confirmLabel="지우기"
        tone="danger"
        onConfirm={() => {
          setForgetOpen(false)
          setAccessKey(null)
        }}
      >
        <p>서버의 데이터는 그대로이며, 다시 쓰려면 키를 입력해야 합니다.</p>
      </ConfirmDialog>

      {/* JSON 복원은 전체 대체 (Q80) */}
      <ConfirmDialog open={restoreOpen} onClose={() => setRestoreOpen(false)} title="백업 파일로 복원" confirmLabel="파일 선택" tone="danger" confirmDisabled onConfirm={() => setRestoreOpen(false)}>
        <p>
          복원하면 지금 앱에 있는 <b>모든 데이터가 백업 내용으로 대체</b>됩니다.
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>선택한 파일의 구조를 먼저 검사합니다.</li>
          <li>현재 데이터를 안전 백업 파일로 내려받습니다.</li>
          <li>Drive 연결 정보는 복원 후 접근 권한을 다시 확인합니다.</li>
        </ol>
        <PrototypeNotice>복원은 5단계에서 연결됩니다.</PrototypeNotice>
      </ConfirmDialog>
    </>
  )
}
