import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/auth'
import { loadFromCache } from '../lib/cache'
import type { UserProfile } from '../models/UserProfile'

export default function Login() {
  const { user, loading, signInWithEmail, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    (async () => {
      if (loading || !user) return
      try {
        let headers: Record<string, string> = {}
        try {
          const mod = await import('../lib/supabaseClient')
          const supa = mod.default?.()
          if (supa) {
            const { data } = await supa.auth.getSession()
            const token = data.session?.access_token
            if (token) headers = { Authorization: `Bearer ${token}` }
          }
        } catch {}
        const r = await fetch(`/api/profile?userId=${encodeURIComponent(user.id)}`, { headers })
        if (r.ok) {
          const { profile } = await r.json()
          if (!profile || !profile.calorieTarget) {
            // Attempt migrating any locally saved profile for anon user to this account
            const local = await loadFromCache<UserProfile>('profile')
            if (local && local.calorieTarget) {
              const migrated = { ...local, id: user.id }
              try {
                await fetch('/api/profile', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...headers },
                  body: JSON.stringify(migrated),
                })
                router.replace('/dashboard')
                return
              } catch {}
            }
            router.replace('/onboarding')
          } else {
            router.replace('/dashboard')
          }
        } else {
          router.replace('/onboarding')
        }
      } catch {
        router.replace('/onboarding')
      }
    })()
  }, [loading, user, router])

  if (loading) return <div className="p-4">Loading…</div>

  if (user) {
    return (
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-2">You are logged in</h1>
        <p className="mb-4 text-sm text-gray-600">{user.email}</p>
        <button className="bg-gray-700 text-white px-3 py-1 rounded" onClick={() => signOut()}>Sign out</button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Login</h1>
      <p className="text-sm text-gray-600 mb-4">Enter your email to receive a magic link.</p>
      <input
        className="w-full border rounded p-2 mb-2"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        className="w-full bg-blue-600 text-white py-2 rounded"
        onClick={async () => {
          const { error } = await signInWithEmail(email)
          setMsg(error ? `Error: ${error}` : 'Check your email for a magic link!')
        }}
      >
        Send Magic Link
      </button>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </div>
  )
}
