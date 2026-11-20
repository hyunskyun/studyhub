import { Suspense, useEffect, useState } from 'react'
import { GraduationCap, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Search, WifiOff, X } from 'lucide-react'
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
        'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors',
        active ? 'bg-accent-soft font-semibold text-accent' : 'text-muted hover:bg-subtle hover:text-fg',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon className="size-5 shrink-0" />
      {!collapsed && <span className="truncate">{r.label}</span>}
    </a>
  )
}

/** iPad·PC: 접힘 가능한 사이드바 (Q153) */
function Sidebar({ path, collapsed, onToggle }: { path: string; collapsed: boolean; onToggle: () => void }) {
  const groups = Object.keys(GROUP_LABEL) as RouteDef['group'][]
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-svh shrink-0 flex-col border-r border-line bg-surface pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] md:flex',
        collapsed ? 'w-[76px]' : 'w-60',
      )}
    >
      <div className={cn('flex h-16 items-center gap-2 px-4', collapsed && 'justify-center px-0')}>
        {!collapsed && (
          <span className="flex min-w-0 flex-1 items-center gap-2 font-bold">
            <GraduationCap className="size-6 shrink-0 text-accent" />
            <span className="truncate">학업 플래너</span>
          </span>
        )}
        <IconButton label={collapsed ? '사이드바 펼치기' : '사이드바 접기'} onClick={onToggle}>
          {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
        </IconButton>
      </div>
      <nav aria-label="주 메뉴" className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {groups.map((g) => (
          <div key={g} className="space-y-0.5">
            {GROUP_LABEL[g] && !collapsed && <p className="px-3 pt-1 pb-1.5 text-xs font-medium text-faint">{GROUP_LABEL[g]}</p>}
            {GROUP_LABEL[g] && collapsed && <div className="mx-3 my-2 border-t border-line" />}
            {ROUTES.filter((r) => r.group === g).map((r) => (
              <NavItem key={r.path} r={r} active={path === r.path} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>
    </aside>
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
            className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-surface px-4 pt-2 pb-[calc(76px+env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between py-1">
              <p className="pl-1 font-semibold">더보기</p>
              <IconButton label="닫기" onClick={() => setMoreOpen(false)}>
                <X className="size-5" />
              </IconButton>
            </div>
            <div className="grid grid-cols-3 gap-2 pb-2">
              {rest.map((r) => {
                const Icon = r.icon
                return (
                  <a
                    key={r.path}
                    href={href(r.path)}
                    aria-current={path === r.path ? 'page' : undefined}
                    className={cn(
                      'flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl text-xs',
                      path === r.path ? 'bg-accent-soft font-semibold text-accent' : 'bg-subtle text-fg',
                    )}
                  >
                    <Icon className="size-5" />
                    {r.label}
                  </a>
                )
              })}
            </div>
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
                className={cn('flex h-16 flex-col items-center justify-center gap-1 text-[11px]', active ? 'font-semibold text-accent' : 'text-muted')}
              >
                <Icon className="size-[22px]" />
                {r.label}
              </a>
            )
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
            className={cn('flex h-16 flex-col items-center justify-center gap-1 text-[11px]', inMore || moreOpen ? 'font-semibold text-accent' : 'text-muted')}
          >
            <MoreHorizontal className="size-[22px]" />
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
          <div role="status" className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-sm text-warning">
            <WifiOff className="size-4" /> 오프라인 상태입니다. 연결되면 다시 동기화됩니다.
          </div>
        )}
        {import.meta.env.DEV && mode === 'fixture' && (
          <div className="bg-accent-soft px-4 py-1.5 text-center text-xs text-accent">개발용 fixture 데이터 표시 중 · 설정에서 끌 수 있습니다</div>
        )}
        <header className="flex h-14 items-center justify-between px-4 pt-[env(safe-area-inset-top)] md:hidden">
          <span className="flex items-center gap-2 font-bold">
            <GraduationCap className="size-6 text-accent" /> 학업 플래너
          </span>
          <a href={href('/search')} aria-label="검색" className="flex size-11 items-center justify-center rounded-xl text-muted hover:bg-subtle">
            <Search className="size-5" />
          </a>
        </header>
        <main
          className={cn(
            'mx-auto w-full max-w-6xl flex-1 px-4 pt-2 pb-[calc(88px+env(safe-area-inset-bottom))] md:px-8 md:pt-8 md:pb-10',
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
