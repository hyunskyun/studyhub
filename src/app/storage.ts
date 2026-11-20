// UI 환경설정(테마·사이드바 접힘 등) 전용 localStorage 래퍼. 학습 데이터 저장에는 쓰지 않는다.
export function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writePref(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* 저장 불가 환경은 무시 */
  }
}
