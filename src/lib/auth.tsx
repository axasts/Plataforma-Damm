import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { Perfil } from './types'

interface AuthState {
  session: Session | null
  perfil: Perfil | null
  loading: boolean
  esEntrenador: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUpYReclamar: (
    email: string,
    password: string,
    profileId: string,
    code: string,
  ) => Promise<void>
  signOut: () => Promise<void>
  refrescarPerfil: () => Promise<void>
}

const Ctx = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)

  async function cargarPerfil(uid: string | undefined) {
    if (!uid) {
      setPerfil(null)
      return
    }
    const { data } = await supabase
      .from('perfiles')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()
    setPerfil((data as Perfil) ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await cargarPerfil(data.session?.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      await cargarPerfil(s?.user.id)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUpYReclamar(
    email: string,
    password: string,
    profileId: string,
    code: string,
  ) {
    // 1. Crear l'usuari (o iniciar sessió si ja existia).
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    let sess = data.session
    if (!sess) {
      // Confirm email desactivat → hi ha sessió. Si no n'hi ha, provem login.
      const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (e2)
        throw new Error(
          'No se pudo iniciar sesión automáticamente. Revisa que "Confirm email" esté desactivado en Supabase.',
        )
      sess = d2.session
    }
    // 2. Reclamar el perfil (valida el codi al servidor).
    const { error: e3 } = await supabase.rpc('claim_profile', {
      p_profile_id: profileId,
      p_code: code,
    })
    if (e3) throw e3
    // 3. Refrescar.
    setSession(sess)
    await cargarPerfil(sess?.user.id)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setPerfil(null)
    setSession(null)
  }

  async function refrescarPerfil() {
    await cargarPerfil(session?.user.id)
  }

  return (
    <Ctx.Provider
      value={{
        session,
        perfil,
        loading,
        esEntrenador: perfil?.rol === 'entrenador',
        signIn,
        signUpYReclamar,
        signOut,
        refrescarPerfil,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth fuera de AuthProvider')
  return c
}
