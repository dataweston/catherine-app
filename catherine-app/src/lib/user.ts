// Generate or read a stable client-only user id for anonymous usage
export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'server'
  const key = 'anon_user_id'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const id = `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`
  window.localStorage.setItem(key, id)
  return id
}
