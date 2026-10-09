import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Escudo } from '../components/ui'

// Pantalla per als usuaris amb perfil a més d'un equip (mateix correu):
// trien amb quin equip entren. Es pot canviar després des de la capçalera.
export default function ElegirEquipo() {
  const { misEquipos, equipo, elegirEquipo, signOut } = useAuth()
  const nav = useNavigate()
  const [cargando, setCargando] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function elegir(id: string) {
    setCargando(id)
    setError('')
    try {
      await elegirEquipo(id)
      nav('/')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCargando(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-damm-bg px-4 text-damm-ink">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Escudo size={56} />
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">¿Con qué equipo entras?</h1>
          <p className="mt-2 text-sm text-damm-muted">Podrás cambiarlo luego desde arriba.</p>
        </div>
        <div className="space-y-3">
          {misEquipos.map((e) => (
            <button
              key={e.id}
              onClick={() => elegir(e.id)}
              disabled={cargando !== null}
              className={
                'flex w-full items-center justify-between rounded-xl border px-5 py-4 text-left transition disabled:opacity-60 ' +
                (e.id === equipo?.id ? 'border-damm-red/60 bg-damm-red/10' : 'border-damm-line bg-damm-panel hover:bg-white/[0.05]')
              }
            >
              <div>
                <p className="font-display text-lg font-bold">{e.nombre}</p>
                <p className="text-xs text-damm-faint">{e.rol === 'entrenador' ? 'Entrenador' : 'Jugador'}</p>
              </div>
              <span className="text-sm font-semibold text-damm-muted">{cargando === e.id ? 'Entrando…' : 'Entrar →'}</span>
            </button>
          ))}
        </div>
        {error && <p className="mt-4 text-center text-sm text-damm-red">{error}</p>}
        <button
          onClick={() => signOut()}
          className="mt-8 w-full text-center text-xs text-damm-faint transition hover:text-damm-muted"
        >
          Salir
        </button>
      </div>
    </div>
  )
}
