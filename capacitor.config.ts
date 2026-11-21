import type { CapacitorConfig } from '@capacitor/cli'

// Android APK: 웹과 같은 빌드 결과(dist/client)를 앱 안에 넣어 실행한다.
// 원격 URL을 띄우는 방식(server.url)은 쓰지 않는다 (05 문서 4장).
// 앱 안의 화면은 https://localhost 에서 열리고, 데이터는 배포된 Worker API로 보낸다.
const config: CapacitorConfig = {
  appId: 'com.hyunskyun.studyhub',
  appName: '학업 플래너',
  webDir: 'dist/client',
  android: {
    // 디버그 빌드에서만 WebView 원격 디버깅 허용
    webContentsDebuggingEnabled: false,
  },
}

export default config
