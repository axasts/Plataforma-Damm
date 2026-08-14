import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Escudo } from '../components/ui'
import { NOMBRE_EQUIPO } from '../config'

type Modo = 'entrar' | 'alta'

interface OpcionPerfil {
  id: string
  nombre: string
  rol: string
}

export default function Login() {
  const { signIn, signUpYReclamar } = useAuth()
  const [modo, setModo] = useState<Modo>('entrar')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  // Entrar
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Alta
  const [codigo, setCodigo] = useState('')
  const [opciones, setOpciones] = useState<OpcionPerfil[] | null>(null)
  const [perfilId, setPerfilId] = useState('')

  async function onEntrar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await signIn(email.trim(), password)
    } catch (err: any) {
      setError(traducir(err.message))
    } finally {
      setCargando(false)
    }
  }

  async function onBuscarCodigo(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const { data, error } = await supabase.rpc('list_unclaimed_profiles', {
        p_code: codigo.trim(),
      })
      if (error) throw error
      const lista = (data as OpcionPerfil[]) ?? []
      if (lista.length === 0) {
        setError('Código incorrecto o no quedan perfiles disponibles.')
        setOpciones(null)
      } else {
        setOpciones(lista)
      }
    } catch (err: any) {
      setError(traducir(err.message))
    } finally {
      setCargando(false)
    }
  }

  async function onAlta(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await signUpYReclamar(email.trim(), password, perfilId, codigo.trim())
    } catch (err: any) {
      setError(traducir(err.message))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-damm-red to-damm-red-darker px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-white">
        <Escudo size={72} />
        <h1 className="mt-3 text-xl font-black tracking-tight">{NOMBRE_EQUIPO}</h1>
        <p className="text-sm text-white/70">Plataforma del equipo</p>
      </div>

      <div className="card w-full max-w-sm p-6">
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 text-sm font-semibold">
          <button
            className={'rounded-md py-2 ' + (modo === 'entrar' ? 'bg-white shadow text-damm-red' : 'text-gray-500')}
            onClick={() => { setModo('entrar'); setError('') }}
          >
            Entrar
          </button>
          <button
            className={'rounded-md py-2 ' + (modo === 'alta' ? 'bg-white shadow text-damm-red' : 'text-gray-500')}
            onClick={() => { setModo('alta'); setError(''); setOpciones(null) }}
          >
            Primer acceso
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        {modo === 'entrar' && (
          <form onSubmit={onEntrar} className="space-y-4">
            <div>
              <label className="label">Correo</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn-primary w-full" disabled={cargando}>
              {cargando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        )}

        {modo === 'alta' && !opciones && (
          <form onSubmit={onBuscarCodigo} className="space-y-4">
            <p className="text-sm text-gray-500">
              Introduce el código que te han dado los entrenadores para ver la lista y elegir tu nombre.
            </p>
            <div>
              <label className="label">Código de acceso</label>
              <input className="input" required value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej: DAMM2026" />
            </div>
            <button className="btn-primary w-full" disabled={cargando}>
              {cargando ? 'Comprobando…' : 'Continuar'}
            </button>
          </form>
        )}

        {modo === 'alta' && opciones && (
          <form onSubmit={onAlta} className="space-y-4">
            <div>
              <label className="label">¿Quién eres?</label>
              <select className="input" required value={perfilId} onChange={(e) => setPerfilId(e.target.value)}>
                <option value="">Elige tu nombre…</option>
                {opciones.map((o) => (
                  <option key={o.id} value={o.id}>{o.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Correo</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Crea una contraseña</label>
              <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn-primary w-full" disabled={cargando || !perfilId}>
              {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
            <button type="button" className="w-full text-center text-xs text-gray-400" onClick={() => setOpciones(null)}>
              ← Cambiar código
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function traducir(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.'
  if (/already registered/i.test(msg)) return 'Ese correo ya tiene cuenta. Usa "Entrar".'
  if (/Password should be/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.'
  return msg
}
