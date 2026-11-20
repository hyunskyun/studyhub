import { AlertCircle, ExternalLink, File, FileSpreadsheet, FileText, FolderOpen, Plus, Unlink } from 'lucide-react'
import { useState } from 'react'
import { useAppData } from '../../app/data-context'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, EmptyState, PageHeader, PrototypeNotice } from '../../components/ui/Layout'
import { ConfirmDialog } from '../../components/ui/Modal'
import type { DriveFile, LinkKind } from '../../domain/types'

const KIND_LABEL: Record<LinkKind, string> = { workbook: '문제집', project: '수행평가', todo: '할 일' }

function FileIcon({ mime }: { mime: string }) {
  if (mime.includes('spreadsheet')) return <FileSpreadsheet className="size-5" />
  if (mime.includes('pdf') || mime.includes('document')) return <FileText className="size-5" />
  return <File className="size-5" />
}

/** Google Drive 연결 자료: 메타데이터만 보관, 원본은 절대 삭제하지 않음 (Q15, Q77, Q103) */
export default function MaterialsPage() {
  const { data } = useAppData()
  const [unlink, setUnlink] = useState<DriveFile | null>(null)

  const linkTitle = (kind: LinkKind, id: string) =>
    kind === 'workbook' ? data.workbooks.find((w) => w.id === id)?.title : kind === 'project' ? data.projects.find((p) => p.id === id)?.title : data.todos.find((t) => t.id === id)?.title

  return (
    <>
      <PageHeader
        title="학습 자료"
        description="Google Drive 파일을 문제집·수행평가·할 일에 연결합니다. 시험 기록에는 연결하지 않습니다."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} disabled title="Drive 권한 연결 후 사용 가능">
            Drive에서 선택
          </Button>
        }
      />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <FolderOpen className="size-5 text-muted" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-medium">Google Drive 파일 접근 권한이 없습니다.</span>
            <span className="block text-muted">Drive 권한은 Google 로그인과 별도로 요청합니다. 설정에서 연결할 수 있습니다.</span>
          </p>
          <a href="#/settings" className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-sm font-medium hover:bg-subtle">
            설정으로
          </a>
        </div>
      </Card>

      {data.driveFiles.length === 0 ? (
        <Card>
          <EmptyState icon={<FolderOpen className="size-6" />} title="연결된 자료가 없습니다" description="앱에는 파일 이름·위치 같은 정보만 저장되고 원본은 Drive에 그대로 있습니다." />
        </Card>
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-line">
            {data.driveFiles.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-5">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${f.status === 'ok' ? 'bg-subtle text-muted' : 'bg-danger-soft text-danger'}`}>
                  {f.status === 'ok' ? <FileIcon mime={f.mimeType} /> : <AlertCircle className="size-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{f.name}</span>
                  <span className="block truncate text-xs text-muted">{f.path}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {f.links.map((l) => (
                      <Badge key={`${l.kind}-${l.id}`}>
                        {KIND_LABEL[l.kind]} · {linkTitle(l.kind, l.id) ?? '삭제됨'}
                      </Badge>
                    ))}
                  </span>
                </span>
                {f.status === 'inaccessible' ? (
                  <Badge tone="danger">접근 불가</Badge>
                ) : (
                  <Button size="sm" variant="ghost" icon={<ExternalLink className="size-4" />}>
                    열기
                  </Button>
                )}
                <Button size="sm" variant="ghost" icon={<Unlink className="size-4" />} onClick={() => setUnlink(f)}>
                  연결 해제
                </Button>
              </li>
            ))}
          </ul>
          {data.driveFiles.some((f) => f.status === 'inaccessible') && (
            <p className="border-t border-line px-4 py-3 text-xs text-muted md:px-5">
              접근 불가: 권한이 취소되었거나 파일이 이동·삭제되었습니다. 연결 정보는 보존되며 권한을 다시 부여하면 복구됩니다.
            </p>
          )}
        </Card>
      )}

      <ConfirmDialog open={!!unlink} onClose={() => setUnlink(null)} title="연결을 해제할까요?" confirmLabel="연결 해제" tone="danger" onConfirm={() => setUnlink(null)}>
        <p>「{unlink?.name}」의 연결 정보만 30일 휴지통으로 이동합니다.</p>
        <p className="font-medium">Google Drive의 원본 파일은 삭제되지 않습니다.</p>
        <PrototypeNotice />
      </ConfirmDialog>
    </>
  )
}
