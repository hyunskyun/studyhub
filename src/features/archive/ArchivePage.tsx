import { useState } from 'react'
import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useRun } from '../../app/useRun'
import { useNow } from '../../app/useNow'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Segmented } from '../../components/ui/Form'
import { Card, EmptyState, PageHeader } from '../../components/ui/Layout'
import { ConfirmDialog } from '../../components/ui/Modal'
import type { RecordKind, TrashItem } from '../../domain/types'

const KIND: Record<RecordKind, string> = {
  todo: '할 일',
  workbook: '문제집',
  project: '수행평가',
  schoolExam: '지필 시험',
  mockExam: '모의고사',
  block: '학습 계획',
  course: '학원 강좌',
  subject: '과목',
  driveLink: '파일 연결',
  session: '공부 기록',
  event: '일정',
}

const RETENTION_DAYS = 30

export default function ArchivePage() {
  const now = useNow()
  const { data, actions } = useAppData()
  const { run, error } = useRun()
  const [tab, setTab] = useState<'trash' | 'archive'>('trash')
  const [restore, setRestore] = useState<TrashItem | null>(null)
  const [purge, setPurge] = useState<TrashItem | null>(null)

  // 수행평가와 함께 삭제된 할 일은 그 수행평가 항목 아래에 묶어 표시
  const trash = data.trash.filter((t) => !t.groupedUnder)
  const daysLeft = (t: TrashItem) => Math.max(0, RETENTION_DAYS - Math.floor((now - Date.parse(t.deletedAt)) / 86_400_000))

  return (
    <>
      <PageHeader title="보관함·휴지통" />
      <Segmented
        className="mb-4"
        label="보기"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'trash', label: `휴지통 ${trash.length || ''}`.trim() },
          { value: 'archive', label: '보관함' },
        ]}
      />

      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
      {tab === 'trash' ? (
        <>
          <p className="mb-3 text-sm text-muted">삭제한 항목은 30일 동안 보관된 뒤 영구 삭제됩니다. Google Drive 원본 파일은 휴지통 대상이 아닙니다.</p>
          {trash.length === 0 ? (
            <Card>
              <EmptyState icon={<Trash2 className="size-6" />} title="휴지통이 비어 있습니다" />
            </Card>
          ) : (
            <Card padded={false}>
              <ul className="divide-y divide-line">
                {trash.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 md:px-5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{t.title}</span>
                      <span className="text-xs text-muted">
                        {KIND[t.kind]}
                        {t.relatedCount ? ` · 연결 항목 ${t.relatedCount}개 함께 보관` : ''}
                      </span>
                    </span>
                    <Badge tone={daysLeft(t) <= 5 ? 'danger' : 'neutral'}>{daysLeft(t)}일 남음</Badge>
                    <Button size="sm" icon={<RotateCcw className="size-4" />} onClick={() => setRestore(t)}>
                      복원
                    </Button>
                    <Button size="sm" variant="ghost" className="text-danger" onClick={() => setPurge(t)}>
                      영구 삭제
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">지난 학기 기록을 보관하면 기본 목록에서 숨겨지지만 장기 통계에는 계속 포함됩니다. 여기에서 바로 수정할 수 있습니다.</p>
          {data.archive.length === 0 ? (
            <Card>
              <EmptyState icon={<Archive className="size-6" />} title="보관된 기록이 없습니다" />
            </Card>
          ) : (
            <Card padded={false}>
              <ul className="divide-y divide-line">
                {data.archive.map((a) => (
                  <li key={a.id} className="flex min-h-11 items-center gap-3 px-4 py-2 md:px-5">
                    <span className="min-w-0 flex-1 truncate">{a.title}</span>
                    <Badge>{KIND[a.kind]}</Badge>
                    <Badge tone="warning">{a.label}</Badge>
                    <Button size="sm" variant="ghost">
                      보관 해제
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {/* 복원: 계획 블록 겹침 시 시간을 먼저 수정 (Q144), 프로젝트는 연결 항목 함께 복원 (Q135) */}
      <ConfirmDialog
        open={!!restore}
        onClose={() => setRestore(null)}
        title="복원할까요?"
        confirmLabel="복원"
        onConfirm={() => {
          if (restore) run(() => actions.restore(restore.collection, restore.id))
          setRestore(null)
        }}
      >
        <p>「{restore?.title}」을(를) 원래 위치로 복원합니다.</p>
        {restore?.kind === 'project' && <p className="text-sm text-muted">함께 삭제된 할 일·하위 항목과 연결 관계도 함께 복원됩니다.</p>}
        {restore?.kind === 'block' && (
          <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">복원할 시간에 다른 학습 계획이 있으면 먼저 날짜·시간을 바꿔야 복원할 수 있습니다.</p>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={!!purge}
        onClose={() => setPurge(null)}
        title="영구 삭제할까요?"
        confirmLabel="영구 삭제"
        tone="danger"
        onConfirm={() => {
          if (purge) run(() => actions.purge(purge.collection, purge.id))
          setPurge(null)
        }}
      >
        <p>「{purge?.title}」을(를) 영구 삭제합니다. 되돌릴 수 없습니다.</p>
        <p className="text-sm text-muted">과거 공부 기록에 남은 이름 정보는 유지됩니다.</p>
      </ConfirmDialog>
    </>
  )
}
