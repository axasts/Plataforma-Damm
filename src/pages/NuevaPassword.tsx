import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { Escudo } from '../components/ui'

// Es mostra quan l'usuari entra per l'enllaç del correu de recuperació.
export default function NuevaPassword() {
  const { cambiarPassword, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function onGuardar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== repetir) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setCargando(true)
    try {
      await cambiarPassword(password)
    } catch (err: any) {
      setError(
        /Password should be/i.test(err.message)
          ? 'La contraseña debe tener al menos 6 caracteres.'
          : /different from the old/i.test(err.message)
            ? 'La contraseña nueva debe ser distinta de la anterior.'
            : err.message,
      )
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-damm-bg p-6 text-damm-ink">
      <div className="w-full max-w-sm rounded-2xl border border-damm-line bg-damm-panel2 px-7 py-9 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Escudo size={36} />
          <span className="font-display text-[15px] font-bold tracking-wide">CF DAMM</span>
        </div>
        <h2 className="mb-6 border-b border-damm-line pb-3 font-display text-xl font-bold tracking-tight">
          Nueva contraseña
        </h2>

        {error && (
          <div className="mb-5 rounded-lg border border-damm-red/30 bg-damm-red/10 px-3 py-2 text-sm text-[#ff8a95]">
            {error}
          </div>
        )}

        <form onSubmit={onGuardar} className="space-y-5">
          <div>
            <label className="label">Contraseña nueva</label>
            <input className="input" type="password" required minLength={6} autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">Repite la contraseña</label>
            <input className="input" type="password" required minLength={6} value={repetir} onChange={(e) => setRepetir(e.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={cargando}>
            {cargando ? 'Guardando…' : 'Guardar y entrar'}
          </button>
          <button type="button" className="w-full text-center text-xs font-medium text-damm-faint hover:text-damm-muted" onClick={() => signOut()}>
            Cancelar
          </button>
        </form>
      </div>
    </div>
  )
}
