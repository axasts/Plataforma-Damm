import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY } from '../config'

// S'ha de llegir abans de crear el client: el client neteja el hash de l'URL
// en processar l'enllaç del correu de recuperació.
export const venimDeRecuperacio =
  typeof window !== 'undefined' && /type=recovery/.test(window.location.hash)

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
