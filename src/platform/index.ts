// 플랫폼 어댑터 (웹 / Android APK).
// 네이티브 여부는 화면 너비가 아니라 Capacitor 플랫폼 API로 판별한다.
import { Capacitor } from '@capacitor/core'

export type Platform = 'web' | 'android'

export function currentPlatform(): Platform {
  return Capacitor.getPlatform() === 'android' ? 'android' : 'web'
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/** 배포된 Worker 주소. APK 안의 화면은 https://localhost 에서 열리므로 API는 절대 주소로 호출한다. */
const NATIVE_API_BASE = (import.meta.env.VITE_NATIVE_API_BASE as string | undefined) ?? 'https://studyhub.7669arni.workers.dev'

/** API 호출 기준 주소: 웹은 같은 출처(상대 경로), 앱은 배포 주소 */
export function apiBase(): string {
  return isNativeApp() ? NATIVE_API_BASE : ''
}
