import React, { createContext, useContext, useEffect, useState } from 'react'
import getSupabase from './supabaseClient'

type AuthContextType = {
  user: { id: string; email?: string | null } | null
  loading: boolean
  signInWithEmail: (email: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextType['user']>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }
    let mounted = true
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      setUser(data.user ? { id: data.user.id, email: data.user.email } : null)
      setLoading(false)
    })()
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const getSiteUrl = () => {
    const env = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
    if (env) return env.replace(/\/$/, '')
    if (typeof window !== 'undefined') return window.location.origin
    return 'http://localhost:3000'
  }

  const signInWithEmail = async (email: string) => {
    const supabase = getSupabase()
    if (!supabase) return { error: 'Auth not configured' }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Ensure the magic link returns to the correct site (prod or dev)
        emailRedirectTo: `${getSiteUrl()}/login`,
      },
    })
    return { error: error?.message }
  }

  const signOut = async () => {
    const supabase = getSupabase()
    if (!supabase) return
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
