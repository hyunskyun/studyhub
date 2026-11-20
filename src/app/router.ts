import { useSyncExternalStore } from 'react'

// 해시 라우팅: Cloudflare Pages·PWA 오프라인·Capacitor WebView 모두에서 서버 설정 없이 동작하고
// 브라우저/Android 시스템 뒤로가기와 자연스럽게 연동된다.

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

function currentPath() {
  const p = location.hash.replace(/^#/, '').split('?')[0]
  return p.startsWith('/') ? p : '/'
}

export function useRoute(): string {
  return useSyncExternalStore(subscribe, currentPath)
}

export function navigate(path: string) {
  location.hash = path
}

export function href(path: string) {
  return `#${path}`
}
