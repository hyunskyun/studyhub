// 이 기기의 식별자·이름 (타이머 소유권 판단용, Q71·Q148)
import { readPref, writePref } from '../app/storage'

const KEY = 'device:id'

export function deviceId(): string {
  let id = readPref(KEY)
  if (!id) {
    id = crypto.randomUUID()
    writePref(KEY, id)
  }
  return id
}

export function deviceName(): string {
  const ua = navigator.userAgent
  if (/iPad|Macintosh.*Mobile|Macintosh.*Safari/.test(ua) && navigator.maxTouchPoints > 1) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/Windows/.test(ua)) return 'Windows PC'
  if (/Mac/.test(ua)) return 'Mac'
  return '다른 기기'
}
