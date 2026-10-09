import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase, venimDeRecuperacio } from './supabase'
import { Perfil, Equipo, MiEquipo } from './types'

interface AuthState {
  session: Session | null
  perfil: Perfil | null
  equipo: Equipo | null
  loading: boolean
  esEntrenador: boolean
  // Interruptor mestre del sistema de punts, segons l'equip de l'usuari.
  usaPuntos: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUpYReclamar: (
    email: string,
    password: string,
    profileId: string,
    code: string,
  ) => Promise<void>
  signOut: () => Promise<void>
  // Recuperació de contrasenya: true quan s'ha entrat per l'enllaç del correu.
  recuperando: boolean
  enviarRecuperacion: (email: string) => Promise<void>
  cambiarPassword: (password: string) => Promise<void>
  refrescarPerfil: () => Promise<void>
  // Multi-perfil: equips on té perfil l'usuari i canvi d'equip.
  misEquipos: MiEquipo[]
  // true quan té més d'un equip i encara no n'ha triat cap en aquesta sessió.
  debeElegirEquipo: boolean
  elegirEquipo: (equipoId: string) => Promise<void>
  // Torna a mostrar la pantalla de triar equip.
  cambiarEquipo: () => void
}

// Recorda (per pestanya) que l'usuari ja ha triat equip, per no tornar-li a
// preguntar a cada recàrrega. Es neteja en fer login/logout.
const CLAVE_ELEGIDO = 'damm_equipo_elegido'
function leerElegido() {
  try { return sessionStorage.getItem(CLAVE_ELEGIDO) === '1' } catch { return false }
}
function guardarElegido(v: boolean) {
  try { v ? sessionStorage.setItem(CLAVE_ELEGIDO, '1') : sessionStorage.removeItem(CLAVE_ELEGIDO) } catch { /* sense storage */ }
}

const Ctx = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [equipo, setEquipo] = useState<Equipo | null>(null)
  const [loading, setLoading] = useState(true)
  const [recuperando, setRecuperando] = useState(venimDeRecuperacio)
  const [misEquipos, setMisEquipos] = useState<MiEquipo[]>([])
  const [elegido, setElegido] = useState(leerElegido)

  async function cargarPerfil(uid: string | undefined) {
    if (!uid) {
      setPerfil(null)
      setEquipo(null)
      setMisEquipos([])
      return
    }
    // Un usuari pot tenir un perfil a cada equip: els llegim tots i ens quedem
    // amb el de l'equip actiu (el que retorna get_mi_equipo).
    const { data } = await supabase.from('perfiles').select('*').eq('user_id', uid)
    const perfiles = (data as Perfil[]) ?? []
    if (perfiles.length === 0) {
      setPerfil(null)
      setEquipo(null)
      setMisEquipos([])
      return
    }
    // L'equip (nom + flag de punts) es llegeix amb una funció segura que no
    // exposa els codis d'accés. Retorna una fila; agafem la primera.
    const [{ data: eq }, { data: mis, error: eMis }] = await Promise.all([
      supabase.rpc('get_mi_equipo'),
      supabase.rpc('get_mis_equipos'),
    ])
    const actual = ((eq as Equipo[]) ?? [])[0] ?? null
    setEquipo(actual)
    setPerfil(perfiles.find((p) => p.equipo_id === actual?.id) ?? perfiles[0])
    // Sense la migració multi-perfil, get_mis_equipos no existeix → un sol equip.
    setMisEquipos(eMis ? [] : ((mis as MiEquipo[]) ?? []))
  }

  async function elegirEquipo(equipoId: string) {
    const { error } = await supabase.rpc('set_equipo_activo', { p_equipo: equipoId })
    if (error) throw error
    guardarElegido(true)
    setElegido(true)
    await cargarPerfil(session?.user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await cargarPerfil(data.session?.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (e, s) => {
      if (e === 'PASSWORD_RECOVERY') setRecuperando(true)
      setSession(s)
      await cargarPerfil(s?.user.id)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    // Login nou → que torni a triar equip si en té més d'un.
    guardarElegido(false)
    setElegido(false)
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
    let sess = data.session
    if (error) {
      // El correu ja té compte (p. ex. ja és en un altre equip): entrem amb la
      // mateixa contrasenya i li afegim aquest perfil.
      if (!/already registered|already exists/i.test(error.message)) throw error
      const { data: d1, error: e1 } = await supabase.auth.signInWithPassword({ email, password })
      if (e1)
        throw new Error(
          'Ese correo ya tiene cuenta (quizá en otro equipo). Pon la misma contraseña que usas para entrar.',
        )
      sess = d1.session
    }
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
    // 3. Refrescar (claim_profile ja deixa actiu l'equip nou).
    guardarElegido(true)
    setElegido(true)
    setSession(sess)
    await cargarPerfil(sess?.user.id)
  }

  async function signOut() {
    await supabase.auth.signOut()
    guardarElegido(false)
    setElegido(false)
    setMisEquipos([])
    setRecuperando(false)
    setPerfil(null)
    setEquipo(null)
    setSession(null)
  }

  async function enviarRecuperacion(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) throw error
  }

  async function cambiarPassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    setRecuperando(false)
  }

  async function refrescarPerfil() {
    await cargarPerfil(session?.user.id)
  }

  return (
    <Ctx.Provider
      value={{
        session,
        perfil,
        equipo,
        loading,
        esEntrenador: perfil?.rol === 'entrenador',
        usaPuntos: equipo?.usa_puntos ?? false,
        signIn,
        signUpYReclamar,
        signOut,
        recuperando,
        enviarRecuperacion,
        cambiarPassword,
        refrescarPerfil,
        misEquipos,
        debeElegirEquipo: misEquipos.length > 1 && !elegido,
        elegirEquipo,
        cambiarEquipo: () => { guardarElegido(false); setElegido(false) },
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
