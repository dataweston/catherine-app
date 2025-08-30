export async function fetchProfile(userId: string) {
  const r = await fetch(`/api/profile?userId=${encodeURIComponent(userId)}`)
  if (!r.ok) return null
  const { profile } = await r.json()
  return profile || null
}