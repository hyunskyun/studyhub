import { Suspense, useEffect, useState } from 'react'
import { GraduationCap, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Search, Settings, WifiOff, X } from 'lucide-react'
import { IconButton } from '../components/ui/Button'
import { cn } from '../components/ui/cn'
import { useAppData } from './data-context'
import { findRoute, GROUP_LABEL, ROUTES, type RouteDef } from './routes'
import { href, useRoute } from './router'
import { readPref, writePref } from './storage'
import { useOnline } from './useOnline'

const COLLAPSE_KEY = 'pref:sidebarCollapsed'

function NavItem({ r, active, collapsed }: { r: RouteDef; active: boolean; collapsed: boolean }) {
  const Icon = r.icon
  return (
    <a
      href={href(r.path)}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? r.label : undefined}
      className={cn(
        'group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-base transition-colors',
        active ? 'font-medium text-accent' : 'text-fg/85 hover:bg-surface/70 hover:text-fg',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon className={cn('size-4 shrink-0', active ? 'text-accent' : 'text-muted group-hover:text-fg')} strokeWidth={active ? 2.25 : 2} />
      {!collapsed && <span className="truncate">{r.label}</span>}
    </a>
  )
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2 font-semibold">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface text-accent shadow-panel">
        <GraduationCap className="size-4" />
      </span>
      {!compact && <span className="truncate text-lg">학업 플래너</span>}
    </span>
  )
}

/** iPad·PC: 접힘 가능한 사이드바 (Q153). 배경과 같은 면에 놓고 항목은 낮은 높이로. */
function Sidebar({ path, collapsed, onToggle }: { path: string; collapsed: boolean; onToggle: () => void }) {
  const groups = Object.keys(GROUP_LABEL) as RouteDef['group'][]
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-svh shrink-0 flex-col pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] md:flex',
        collapsed ? 'w-[60px]' : 'w-52',
      )}
    >
      <div className={cn('flex h-14 items-center gap-1 pr-2 pl-4', collapsed && 'flex-col justify-center gap-0 px-0 pt-2')}>
        {collapsed ? <Brand compact /> : <span className="min-w-0 flex-1"><Brand /></span>}
        <IconButton size="sm" label={collapsed ? '사이드바 펼치기' : '사이드바 접기'} onClick={onToggle}>
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </IconButton>
      </div>
      <nav aria-label="주 메뉴" className={cn('flex-1 overflow-y-auto px-2 pt-3 pb-4', collapsed && 'pt-6')}>
        {groups.map((g) => (
          <div key={g} className="mb-5 space-y-px last:mb-0">
            {ROUTES.filter((r) => r.group === g).map((r) => (
              <NavItem key={r.path} r={r} active={path === r.path} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}

/** iPad·PC 상단 바: 검색 진입 + 설정 */
function TopBar() {
  return (
    <div className="hidden h-14 items-center gap-3 px-8 pt-[env(safe-area-inset-top)] md:flex">
      <a
        href={href('/search')}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-md bg-surface px-3 text-sm text-faint shadow-control transition-colors hover:text-muted"
      >
        <Search className="size-4" /> 검색
      </a>
      <span className="flex-1" />
      <a href={href('/settings')} aria-label="설정" className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-fg">
        <Settings className="size-[18px]" />
      </a>
    </div>
  )
}

/** 스마트폰: 하단 탭 + 더보기 (Q153) */
function BottomNav({ path }: { path: string }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const tabs = ROUTES.filter((r) => r.tab)
  const rest = ROUTES.filter((r) => !r.tab)
  const inMore = rest.some((r) => r.path === path)

  useEffect(() => {
    const close = () => setMoreOpen(false)
    window.addEventListener('hashchange', close)
    return () => window.removeEventListener('hashchange', close)
  }, [])

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-overlay" onClick={() => setMoreOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="더보기 메뉴"
            className="absolute inset-x-0 bottom-0 max-h-[75svh] overflow-y-auto rounded-t-xl bg-surface pb-[calc(56px+env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between border-b border-line py-1 pr-2 pl-4">
              <p className="text-base font-semibold">더보기</p>
              <IconButton label="닫기" onClick={() => setMoreOpen(false)}>
                <X className="size-4" />
              </IconButton>
            </div>
            <ul className="divide-y divide-line">
              {rest.map((r) => {
                const Icon = r.icon
                const active = path === r.path
                return (
                  <li key={r.path}>
                    <a
                      href={href(r.path)}
                      aria-current={active ? 'page' : undefined}
                      className={cn('flex h-11 items-center gap-3 px-4 text-base', active ? 'font-medium text-accent' : 'text-fg')}
                    >
                      <Icon className={cn('size-4', active ? 'text-accent' : 'text-muted')} />
                      {r.label}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
      <nav
        aria-label="주 메뉴"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {tabs.map((r) => {
            const Icon = r.icon
            const active = path === r.path
            return (
              <a
                key={r.path}
                href={href(r.path)}
                aria-current={active ? 'page' : undefined}
                className={cn('flex h-14 flex-col items-center justify-center gap-1 text-[10.5px]', active ? 'font-medium text-accent' : 'text-muted')}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                {r.label}
              </a>
            )
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
            className={cn('flex h-14 flex-col items-center justify-center gap-1 text-[10.5px]', inMore || moreOpen ? 'font-medium text-accent' : 'text-muted')}
          >
            <MoreHorizontal className="size-5" strokeWidth={1.75} />
            더보기
          </button>
        </div>
      </nav>
    </>
  )
}

export function AppShell() {
  const path = useRoute()
  const route = findRoute(path)
  const Page = route.page
  const online = useOnline()
  const { mode, ready } = useAppData()
  const [collapsed, setCollapsed] = useState(() => readPref(COLLAPSE_KEY) === '1')

  useEffect(() => {
    document.title = `${route.label} · 학업 플래너`
    window.scrollTo(0, 0)
  }, [route.label])

  return (
    <div className="flex min-h-svh bg-bg">
      <Sidebar
        path={route.path}
        collapsed={collapsed}
        onToggle={() =>
          setCollapsed((c) => {
            writePref(COLLAPSE_KEY, c ? null : '1')
            return !c
          })
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 상시 동기화 상태 표시는 없음(Q109). 오프라인일 때만 알림. */}
        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] text-sm text-warning">
            <WifiOff className="size-3.5" /> 오프라인 상태입니다. 연결되면 다시 동기화됩니다.
          </div>
        )}
        {import.meta.env.DEV && mode === 'fixture' && (
          <div className="bg-accent-soft px-4 py-1 text-center text-xs text-accent">개발용 fixture 데이터 표시 중 · 설정에서 끌 수 있습니다</div>
        )}
        <header className="flex h-12 items-center justify-between pr-2 pl-4 pt-[env(safe-area-inset-top)] md:hidden">
          <Brand />
          <a href={href('/search')} aria-label="검색" className="flex size-10 items-center justify-center rounded-md text-muted hover:bg-surface">
            <Search className="size-[18px]" />
          </a>
        </header>
        <TopBar />
        <main
          className={cn(
            'mx-auto w-full max-w-6xl flex-1 px-4 pt-2 pb-[calc(76px+env(safe-area-inset-bottom))] md:px-8 md:pt-3 md:pb-10',
            'pr-[max(1rem,env(safe-area-inset-right))] md:pr-[max(2rem,env(safe-area-inset-right))]',
          )}
        >
          <Suspense fallback={<div className="py-20 text-center text-sm text-muted">불러오는 중…</div>}>
            {ready ? <Page key={route.path} /> : <div className="py-20 text-center text-sm text-muted">불러오는 중…</div>}
          </Suspense>
        </main>
      </div>
      <BottomNav path={route.path} />
    </div>
  )
}
