import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'

const AuthContext = createContext(null)

// Reads the admin flag off app_metadata (set server-side via the service role,
// never editable by the user themselves — unlike user_metadata).
function isAdminUser(user) {
  return !!user && user.app_metadata?.role === 'admin'
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [aal, setAal] = useState(null) // { currentLevel, nextLevel }
  const [loading, setLoading] = useState(true)

  const refreshAal = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (!error) setAal(data)
    return data
  }, [])

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session)
      await refreshAal()
      setLoading(false)
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      await refreshAal()
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [refreshAal])

  const user = session?.user ?? null

  // Fully authenticated = valid session + admin role + MFA satisfied (aal2)
  const mfaSatisfied = aal ? aal.currentLevel === aal.nextLevel : false
  const isAdmin = isAdminUser(user)
  const isFullyAuthed = !!user && isAdmin && mfaSatisfied
  const needsMfaChallenge = !!user && isAdmin && aal && aal.nextLevel === 'aal2' && aal.currentLevel === 'aal1'

  const signInWithPassword = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (!isAdminUser(data.user)) {
      await supabase.auth.signOut()
      throw new Error('This account is not authorized to access the admin dashboard.')
    }
    await refreshAal()
    return data
  }, [refreshAal])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setAal(null)
  }, [])

  const value = {
    session,
    user,
    loading,
    isAdmin,
    aal,
    mfaSatisfied,
    isFullyAuthed,
    needsMfaChallenge,
    signInWithPassword,
    signOut,
    refreshAal,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
