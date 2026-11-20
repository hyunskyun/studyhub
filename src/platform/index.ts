// 플랫폼 어댑터 (웹 / Android APK).
// Capacitor 도입(디자인 승인 이후 단계) 전까지는 항상 웹으로 동작한다.
// 네이티브 여부는 화면 너비가 아니라 플랫폼 API(Capacitor.isNativePlatform)로 판별할 예정.

export type Platform = 'web' | 'android'

export function currentPlatform(): Platform {
  return 'web'
}

export function isNativeApp(): boolean {
  return currentPlatform() !== 'web'
}
