export async function fetchProfile(userId: string) {
  let headers: Record<string, string> = {}
  try {
    const mod = await import('./supabaseClient')
    const supa = mod.default?.()
    if (supa) {
      const { data } = await supa.auth.getSession()
      const token = data.session?.access_token
      if (token) headers = { Authorization: `Bearer ${token}` }
    }
  } catch {}
  const r = await fetch(`/api/profile?userId=${encodeURIComponent(userId)}`, { headers })
  if (!r.ok) return null
  const { profile } = await r.json()
  return profile || null
}