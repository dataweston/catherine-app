// Async IndexedDB-backed cache with SSR and localStorage fallback
import { get, set } from 'idb-keyval'

const hasWindow = typeof window !== 'undefined'
const hasIDB = hasWindow && 'indexedDB' in window

export async function saveToCache(key: string, value: unknown): Promise<void> {
  if (hasIDB) {
    await set(key, value)
    return
  }
  if (hasWindow && window.localStorage) {
    window.localStorage.setItem(key, JSON.stringify(value))
    return
  }
  // SSR no-op fallback
}

export async function loadFromCache<T>(key: string): Promise<T | null> {
  if (hasIDB) {
    const val = await get<T | null>(key)
    return (val ?? null) as T | null
  }
  if (hasWindow && window.localStorage) {
    const item = window.localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : null
  }
  return null
}
