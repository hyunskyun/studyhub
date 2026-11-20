import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import {
  Archive,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  Home,
  School,
  Search,
  Settings,
  Table2,
  Timer,
  type LucideIcon,
} from 'lucide-react'

export interface RouteDef {
  path: string
  label: string
  icon: LucideIcon
  page: LazyExoticComponent<ComponentType>
  /** 스마트폰 하단 탭에 노출 (나머지는 더보기) */
  tab?: boolean
  group: 'main' | 'study' | 'school' | 'system'
}

export const ROUTES: RouteDef[] = [
  { path: '/', label: '홈', icon: Home, tab: true, group: 'main', page: lazy(() => import('../features/home/HomePage')) },
  { path: '/calendar', label: '캘린더', icon: CalendarDays, tab: true, group: 'main', page: lazy(() => import('../features/calendar/CalendarPage')) },
  { path: '/todos', label: '할 일', icon: CheckSquare, tab: true, group: 'main', page: lazy(() => import('../features/todos/TodosPage')) },
  { path: '/timer', label: '타이머·기록', icon: Timer, tab: true, group: 'main', page: lazy(() => import('../features/timer/TimerPage')) },
  { path: '/workbooks', label: '문제집', icon: BookOpen, group: 'study', page: lazy(() => import('../features/workbooks/WorkbooksPage')) },
  { path: '/exams', label: '시험·성적', icon: GraduationCap, group: 'study', page: lazy(() => import('../features/exams/ExamsPage')) },
  { path: '/projects', label: '수행평가', icon: ClipboardList, group: 'study', page: lazy(() => import('../features/projects/ProjectsPage')) },
  { path: '/academy', label: '학원', icon: School, group: 'study', page: lazy(() => import('../features/academy/AcademyPage')) },
  { path: '/stats', label: '목표·통계', icon: BarChart3, group: 'study', page: lazy(() => import('../features/stats/StatsPage')) },
  { path: '/materials', label: '학습 자료', icon: FolderOpen, group: 'school', page: lazy(() => import('../features/materials/MaterialsPage')) },
  { path: '/timetable', label: '학교 시간표', icon: Table2, group: 'school', page: lazy(() => import('../features/timetable/TimetablePage')) },
  { path: '/search', label: '검색', icon: Search, group: 'system', page: lazy(() => import('../features/search/SearchPage')) },
  { path: '/archive', label: '보관함·휴지통', icon: Archive, group: 'system', page: lazy(() => import('../features/archive/ArchivePage')) },
  { path: '/settings', label: '설정', icon: Settings, group: 'system', page: lazy(() => import('../features/settings/SettingsPage')) },
]

export const GROUP_LABEL: Record<RouteDef['group'], string | null> = {
  main: null,
  study: '학습 관리',
  school: '학교',
  system: '앱',
}

export function findRoute(path: string): RouteDef {
  return ROUTES.find((r) => r.path === path) ?? ROUTES[0]
}
