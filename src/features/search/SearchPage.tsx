import { useState } from 'react'
import { BookOpen, CheckSquare, ClipboardList, FolderOpen, GraduationCap, Search } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { href } from '../../app/router'
import { Badge } from '../../components/ui/Badge'
import { Toggle } from '../../components/ui/Form'
import { Card, EmptyState, PageHeader } from '../../components/ui/Layout'

interface Hit {
  id: string
  title: string
  kind: string
  to: string
  icon: typeof Search
  archived?: boolean
}

/** 이름 통합 검색 (Q113). 보관 기록은 기본 제외, 선택 시 포함 (Q119). 본문 검색 없음. */
export default function SearchPage() {
  const { data, subjectName } = useAppData()
  const [q, setQ] = useState('')
  const [includeArchive, setIncludeArchive] = useState(false)

  const all: Hit[] = [
    ...data.todos.map((t) => ({ id: t.id, title: t.title, kind: '할 일', to: '/todos', icon: CheckSquare })),
    ...data.workbooks.map((w) => ({ id: w.id, title: w.title, kind: '문제집', to: '/workbooks', icon: BookOpen })),
    ...data.projects.map((p) => ({ id: p.id, title: p.title, kind: '수행평가', to: '/projects', icon: ClipboardList })),
    ...data.mockExams.map((e) => ({ id: e.id, title: `${e.year}년 ${e.month}월 ${e.org} ${subjectName(e.subjectId)}`, kind: '모의고사', to: '/exams', icon: GraduationCap })),
    ...data.schoolExams.map((e) => ({ id: e.id, title: `${e.year} ${e.semester}학기 ${subjectName(e.subjectId)} ${e.term === 'midterm' ? '중간고사' : '기말고사'}`, kind: '지필 시험', to: '/exams', icon: GraduationCap })),
    ...data.driveFiles.map((f) => ({ id: f.id, title: f.name, kind: 'Drive 파일', to: '/materials', icon: FolderOpen })),
    ...(includeArchive ? data.archive.map((a) => ({ id: a.id, title: a.title, kind: a.label, to: '/archive', icon: BookOpen, archived: true })) : []),
  ]
  const term = q.trim().toLowerCase()
  const hits = term ? all.filter((h) => h.title.toLowerCase().includes(term)) : []

  return (
    <>
      <PageHeader title="검색" />
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-faint" />
        <input
          type="search"
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="할 일·문제집·프로젝트·시험·파일 이름"
          aria-label="이름 검색"
          className="h-13 w-full rounded-2xl border border-line bg-surface pr-4 pl-12 text-base outline-none focus:border-accent"
        />
      </div>
      <div className="mb-4 max-w-sm">
        <Toggle label="보관된 기록 포함" checked={includeArchive} onChange={setIncludeArchive} />
      </div>
      {!term ? (
        <EmptyState icon={<Search className="size-6" />} title="이름으로 검색합니다" description="내용 전체가 아니라 항목 이름만 찾습니다." />
      ) : hits.length === 0 ? (
        <EmptyState compact title={`“${q}”에 해당하는 항목이 없습니다`} />
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-line">
            {hits.map((h) => {
              const Icon = h.icon
              return (
                <li key={`${h.kind}-${h.id}`}>
                  <a href={href(h.to)} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-subtle md:px-5">
                    <Icon className="size-5 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate">{h.title}</span>
                    {h.archived && <Badge tone="warning">보관</Badge>}
                    <Badge>{h.kind}</Badge>
                  </a>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </>
  )
}
