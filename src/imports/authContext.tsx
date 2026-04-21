import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabaseClient'

type AuthState = {
  ready: boolean
  session: Session | null
  user: User | null
  /** True when env is set and we use cloud data (legacy localStorage otherwise). */
  isCloud: boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    const client = supabase
    if (!client) {
      setSession(null)
      setReady(true)
      return
    }

    let cancelled = false

    const init = async () => {
      const { data } = await client.auth.getSession()
      if (cancelled) return
      let nextSession = data.session
      if (!nextSession) {
        const { data: anon, error } = await client.auth.signInAnonymously()
        if (error) {
          console.error('Supabase anonymous sign-in failed:', error.message)
        } else {
          nextSession = anon.session
        }
      }
      if (!cancelled) setSession(nextSession ?? null)
      if (!cancelled) setReady(true)
    }

    void init()

    const { data: sub } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      isCloud: isSupabaseConfigured && !!session?.user,
    }),
    [ready, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
