import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useAuth } from '../lib/auth'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])
  if (loading) return <div className="p-4">Loading…</div>
  if (!user) return null
  return <>{children}</>
}
