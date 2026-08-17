import { useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Escudo } from '../components/ui'

type Modo = 'entrar' | 'alta'

interface OpcionPerfil {
  id: string
  nombre: string
  rol: string
}

export default function Login() {
  const { signIn, signUpYReclamar } = useAuth()
  // El alta ("primer acceso") solo se muestra si se entra por el enlace con ?alta
  const altaPermitida = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('alta')
  const [modo, setModo] = useState<Modo>(altaPermitida ? 'alta' : 'entrar')
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

  function cambiarModo(m: Modo) {
    setModo(m)
    setError('')
    if (m === 'entrar') setOpciones(null)
  }

  return (
    <div className="min-h-screen bg-damm-bg text-damm-ink md:flex md:items-center md:justify-center md:p-6">
      <div className="mx-auto grid min-h-screen w-full max-w-5xl overflow-hidden md:min-h-0 md:grid-cols-[1.05fr_0.95fr] md:rounded-2xl md:border md:border-damm-line md:shadow-2xl">
        {/* ---------- Marca ---------- */}
        <div
          className="relative flex flex-col overflow-hidden px-7 py-9 md:px-10 md:py-12"
          style={{ background: 'radial-gradient(120% 90% at 12% 8%, #17191f 0%, #0a0b0d 60%)' }}
        >
          <div className="pointer-events-none absolute -bottom-16 -right-16 opacity-[0.05]">
            <Escudo size={300} />
          </div>
          <div className="flex items-center gap-3">
            <Escudo size={40} />
            <span className="font-display text-[15px] font-bold tracking-wide">CF DAMM</span>
          </div>
          <div className="mt-10 md:mt-auto">
            <span className="eyebrow text-damm-gold">Plataforma del equipo</span>
            <h1 className="mt-3 font-display text-4xl font-bold leading-[0.98] tracking-tight md:text-5xl">
              Cadet A
            </h1>
            <p className="mt-2 max-w-[34ch] text-sm font-medium text-damm-muted">
              Rendimiento, bienestar y clasificación.
            </p>
            <div className="my-5 h-0.5 w-12 bg-damm-gold" />
            <p className="max-w-[36ch] text-sm text-damm-muted">
              El día a día del equipo en un solo sitio: puntos, encuestas de wellness y RPE,
              asistencia y lesiones.
            </p>
          </div>
        </div>

        {/* ---------- Formulario ---------- */}
        <div className="flex flex-col justify-center bg-damm-panel2 px-7 py-9 md:px-10 md:py-12">
          {altaPermitida ? (
            <div className="mb-7 flex gap-7 border-b border-damm-line">
              <TabBtn on={modo === 'alta'} onClick={() => cambiarModo('alta')}>Primer acceso</TabBtn>
              <TabBtn on={modo === 'entrar'} onClick={() => cambiarModo('entrar')}>Entrar</TabBtn>
            </div>
          ) : (
            <h2 className="mb-7 border-b border-damm-line pb-3 font-display text-xl font-bold tracking-tight">Entrar</h2>
          )}

          {error && (
            <div className="mb-5 rounded-lg border border-damm-red/30 bg-damm-red/10 px-3 py-2 text-sm text-[#ff8a95]">
              {error}
            </div>
          )}

          {modo === 'entrar' && (
            <form onSubmit={onEntrar} className="space-y-5">
              <Campo label="Correo">
                <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </Campo>
              <Campo label="Contraseña">
                <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </Campo>
              <button className="btn-primary w-full" disabled={cargando}>
                {cargando ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
          )}

          {modo === 'alta' && !opciones && (
            <form onSubmit={onBuscarCodigo} className="space-y-5">
              <p className="text-sm text-damm-muted">
                Introduce el código que te han dado los entrenadores para ver la lista y elegir tu nombre.
              </p>
              <Campo label="Código de acceso">
                <input className="input" required value={codigo} onChange={(e) => setCodigo(e.target.value)} />
              </Campo>
              <button className="btn-primary w-full" disabled={cargando}>
                {cargando ? 'Comprobando…' : 'Continuar'}
              </button>
            </form>
          )}

          {modo === 'alta' && opciones && (
            <form onSubmit={onAlta} className="space-y-5">
              <Campo label="¿Quién eres?">
                <div className="max-h-56 overflow-y-auto rounded-lg border border-damm-line divide-y divide-damm-line">
                  {opciones.map((o) => {
                    const on = perfilId === o.id
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setPerfilId(o.id)}
                        className={'flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition ' + (on ? 'bg-damm-red/15 text-damm-ink' : 'text-damm-muted hover:bg-white/[0.04] hover:text-damm-ink')}
                      >
                        {o.nombre}
                        {on && <span className="text-xs font-semibold text-damm-red">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </Campo>
              <Campo label="Correo">
                <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </Campo>
              <Campo label="Crea una contraseña">
                <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </Campo>
              <button className="btn-primary w-full" disabled={cargando || !perfilId}>
                {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
              </button>
              <button type="button" className="w-full text-center text-xs font-medium text-damm-faint hover:text-damm-muted" onClick={() => setOpciones(null)}>
                ← Cambiar código
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'relative -mb-px pb-3 text-sm font-semibold transition ' +
        (on ? 'text-damm-ink' : 'text-damm-faint hover:text-damm-muted')
      }
    >
      {children}
      {on && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-damm-red" />}
    </button>
  )
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

function traducir(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.'
  if (/already registered/i.test(msg)) return 'Ese correo ya tiene cuenta. Usa "Entrar".'
  if (/Password should be/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.'
  return msg
}
