import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sync is OPTIONAL. If env vars are absent the app runs local-only and `supabase`
// stays null — every sync/auth call checks `syncEnabled` first.
export const syncEnabled = Boolean(url && anon)

export const supabase = syncEnabled
  ? createClient(url, anon, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
