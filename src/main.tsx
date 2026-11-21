import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isNativeApp } from './platform'

// 웹(PC·iPad)에서만 서비스 워커 등록. APK는 화면 파일이 앱 안에 들어 있어 필요 없다.
if (!isNativeApp() && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
