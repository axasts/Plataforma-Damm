import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Perfil } from '../../lib/types'
import { Spinner, Section, Badge, Modal } from '../../components/ui'

export default function Plantilla() {
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [codigos, setCodigos] = useState<{ team_code: string; staff_code: string } | null>(null)
  const [cargando, setCargando] = useState(true)
  const [editar, setEditar] = useState<Perfil | null>(null)

  async function cargar() {
    const [p, e] = await Promise.all([
      supabase.from('perfiles').select('*').order('rol').order('nombre'),
      supabase.from('equipo').select('team_code,staff_code').maybeSingle(),
    ])
    setPerfiles((p.data as Perfil[]) ?? [])
    setCodigos((e.data as any) ?? null)
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  if (cargando) return <Spinner />

  const jugadores = perfiles.filter((p) => p.rol === 'jugador')
  const entrenadores = perfiles.filter((p) => p.rol === 'entrenador')

  return (
    <div>
      <h1 className="mb-4 text-lg font-black text-damm-ink">Plantilla 👥</h1>

      {codigos && (
        <div className="card mb-6 p-4">
          <p className="mb-2 text-sm font-semibold text-damm-ink">Códigos de acceso</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge color="red">Equipo: <span className="ml-1 font-mono font-bold">{codigos.team_code}</span></Badge>
            <Badge color="gold">Entrenadores: <span className="ml-1 font-mono font-bold">{codigos.staff_code}</span></Badge>
          </div>
        </div>
      )}

      <Section title={`Jugadores (${jugadores.length})`}>
        <div className="card divide-y divide-gray-100">
          {jugadores.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
              <Link to={`/jugador/${p.id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-damm-ink">{p.nombre}</p>
                <p className="truncate text-xs text-gray-400">{p.posicion ?? 'Sin posición'}</p>
              </Link>
              {p.user_id ? <Badge color="green">Alta ✓</Badge> : <Badge color="gray">Sin alta</Badge>}
              <button onClick={() => setEditar(p)} className="ml-3 text-gray-300 hover:text-damm-red" aria-label="Editar">✏️</button>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Entrenadores (${entrenadores.length})`}>
        <div className="card divide-y divide-gray-100">
          {entrenadores.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm font-medium text-damm-ink">{p.nombre}</span>
              {p.user_id ? <Badge color="green">Alta ✓</Badge> : <Badge color="gray">Sin alta</Badge>}
            </div>
          ))}
        </div>
      </Section>

      {editar && <PosicionModal perfil={editar} onClose={() => setEditar(null)} onSaved={() => { setEditar(null); cargar() }} />}
    </div>
  )
}

function PosicionModal({ perfil, onClose, onSaved }: {
  perfil: Perfil; onClose: () => void; onSaved: () => void
}) {
  const [posicion, setPosicion] = useState(perfil.posicion ?? '')
  const [guardando, setGuardando] = useState(false)
  async function guardar() {
    setGuardando(true)
    await supabase.from('perfiles').update({ posicion: posicion || null }).eq('id', perfil.id)
    setGuardando(false)
    onSaved()
  }
  return (
    <Modal open onClose={onClose} title={perfil.nombre}>
      <div className="space-y-3">
        <div>
          <label className="label">Posición (solo la ven los entrenadores)</label>
          <input className="input" value={posicion} onChange={(e) => setPosicion(e.target.value)} placeholder="Ej: Lateral derecho" />
        </div>
        <button className="btn-primary w-full" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </Modal>
  )
}
