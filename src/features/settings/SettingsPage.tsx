import { useState } from 'react'
import { Download, FolderOpen, LogIn, Monitor, Moon, Plus, Sun, Upload } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useTheme, type ThemePref } from '../../app/theme-context'
import { SubjectDot } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { cn } from '../../components/ui/cn'
import { Toggle } from '../../components/ui/Form'
import { Card, EmptyState, PageHeader, PrototypeNotice } from '../../components/ui/Layout'
import { ConfirmDialog } from '../../components/ui/Modal'

const THEMES: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: '라이트', icon: Sun },
  { value: 'dark', label: '다크', icon: Moon },
  { value: 'system', label: '시스템', icon: Monitor },
]

export default function SettingsPage() {
  const { pref, setPref } = useTheme()
  const { data, mode, setFixture } = useAppData()
  const [restoreOpen, setRestoreOpen] = useState(false)

  return (
    <>
      <PageHeader title="설정" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="계정">
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted">Google 계정으로 로그인하면 PC·iPad·Android 기기 사이에 기록이 동기화됩니다.</p>
            <Button variant="primary" icon={<LogIn className="size-4" />} disabled title="3단계에서 연결">
              Google로 로그인
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
          <div role="radiogroup" aria-label="화면 테마" className="grid grid-cols-3 gap-2">
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
                    'flex h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border text-sm font-medium transition-colors',
                    pref === t.value ? 'border-accent bg-accent-soft text-accent' : 'border-line hover:bg-subtle',
                  )}
                >
                  <Icon className="size-5" />
                  {t.label}
                </button>
              )
            })}
          </div>
        </Card>

        <Card title="과목" action={<Button size="sm" icon={<Plus className="size-4" />}>추가</Button>}>
          {data.subjects.length === 0 ? (
            <EmptyState compact title="과목이 없습니다" description="대분류(예: 수학) 아래에 세부 과목(예: 미적분Ⅰ)을 둘 수 있습니다." />
          ) : (
            <ul className="space-y-1">
              {data.subjects
                .filter((s) => !s.parentId)
                .map((r) => (
                  <li key={r.id}>
                    <p className="flex min-h-10 items-center gap-2 font-medium">
                      <SubjectDot color={r.color} /> {r.name}
                    </p>
                    {data.subjects
                      .filter((s) => s.parentId === r.id)
                      .map((s) => (
                        <p key={s.id} className="flex min-h-9 items-center gap-2 pl-5 text-sm text-muted">
                          └ {s.name}
                        </p>
                      ))}
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card title="오답 원인 분류">
          <ul className="flex flex-wrap gap-2">
            {data.errorCauses.map((c) => (
              <li key={c.id} className={cn('rounded-full border border-line px-3 py-1.5 text-sm', !c.active && 'text-faint line-through')}>
                {c.name}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">기본 분류를 제공하며 추가·이름 변경·비활성화할 수 있습니다.</p>
        </Card>

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
