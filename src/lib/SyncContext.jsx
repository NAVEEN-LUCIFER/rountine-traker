import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, syncEnabled } from '../db/supabase.js'
import { startSync, stopSync, onStatus, resetWatermark } from './sync.js'
import { clearAllDays } from '../db/db.js'

const Ctx = createContext(null)
export const useSync = () => useContext(Ctx)

export function SyncProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!syncEnabled)
  const [status, setStatus] = useState(syncEnabled ? 'syncing' : 'local')

  useEffect(() => {
    const off = onStatus(setStatus)
    return off
  }, [])

  useEffect(() => {
    if (!syncEnabled) return
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setAuthReady(true)
      if (data.session) startSync(data.session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      if (sess) startSync(sess)
      else stopSync()
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
      stopSync()
    }
  }, [])

  const api = {
    syncEnabled,
    session,
    authReady,
    status,
    user: session?.user || null,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    async signUp(email, password) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
    },
    async signInWithGoogle() {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    },
    async signInWithMagicLink(email) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) throw error
    },
    async signOut() {
      const uid = session?.user?.id
      stopSync()
      await supabase.auth.signOut()
      resetWatermark(uid)
      // Forget this device's cached rows so a different account starts clean.
      await clearAllDays()
    },
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
