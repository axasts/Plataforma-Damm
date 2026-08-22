import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Perfil } from '../../lib/types'
import { Spinner, Badge, Modal, IconEdit, IconTrash, PageHeader } from '../../components/ui'
import { ordenPosicion, POSICIONES } from '../../lib/utils'

export default function Plantilla() {
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [codigos, setCodigos] = useState<{ team_code: string; staff_code: string } | null>(null)
  const [cargando, setCargando] = useState(true)
  const [editar, setEditar] = useState<Perfil | null>(null)

  async function cargar() {
    const [p, e] = await Promise.all([
      supabase.from('perfiles').select('*').eq('demo', false).order('rol').order('nombre'),
      supabase.from('equipo').select('team_code,staff_code').maybeSingle(),
    ])
    setPerfiles((p.data as Perfil[]) ?? [])
    setCodigos((e.data as any) ?? null)
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  async function borrar(p: Perfil) {
    if (!window.confirm(`¿Eliminar a ${p.nombre}? También se borrarán sus datos (puntos, encuestas, asistencia…). No se puede deshacer.`)) return
    await supabase.from('perfiles').delete().eq('id', p.id)
    cargar()
  }

  if (cargando) return <Spinner />

  const jugadores = perfiles.filter((p) => p.rol === 'jugador')
  const entrenadores = perfiles.filter((p) => p.rol === 'entrenador')

  // Agrupar jugadores por posición (así el entrenador ve el equipo por líneas)
  const porPosicion = new Map<string, Perfil[]>()
  for (const p of jugadores) {
    const pos = p.posicion?.trim() || 'Sin posición'
    if (!porPosicion.has(pos)) porPosicion.set(pos, [])
    porPosicion.get(pos)!.push(p)
  }
  // Orden por líneas: porteros → centrales → laterales → pivote → interiores
  // → punta → extremos, y dentro de cada línea primero el derecho.
  const gruposOrdenados = [...porPosicion.entries()].sort((a, b) => {
    const oa = ordenPosicion(a[0]), ob = ordenPosicion(b[0])
    return oa !== ob ? oa - ob : a[0].localeCompare(b[0], 'es')
  })

  return (
    <div>
      <PageHeader
        eyebrow="Equipo"
        title="Plantilla"
        subtitle={`${jugadores.length} jugadores · ${entrenadores.length} entrenadores`}
      />

      {codigos && (
        <div className="mb-8 grid grid-cols-2 divide-x divide-damm-line border-y border-damm-line">
          <div className="px-4 py-3.5">
            <p className="eyebrow text-damm-faint">Código equipo</p>
            <p className="mt-1.5 font-mono text-lg font-bold tracking-wide text-damm-ink">{codigos.team_code}</p>
          </div>
          <div className="px-4 py-3.5">
            <p className="eyebrow text-damm-faint">Código entrenadores</p>
            <p className="mt-1.5 font-mono text-lg font-bold tracking-wide text-damm-gold">{codigos.staff_code}</p>
          </div>
        </div>
      )}

      <div className="space-y-7">
        {gruposOrdenados.map(([pos, list]) => (
          <div key={pos}>
            <div className="mb-1 flex items-baseline justify-between border-b border-damm-line2 pb-2">
              <h2 className="eyebrow text-damm-muted">{pos}</h2>
              <span className="text-xs tabular-nums text-damm-faint">{list.length}</span>
            </div>
            {list.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-damm-line py-3">
                <Link to={`/jugador/${p.id}`} className="min-w-0 flex-1 text-sm font-medium text-damm-ink transition hover:text-damm-red">
                  {p.nombre}
                </Link>
                {p.user_id ? <Badge color="green">Alta ✓</Badge> : <Badge color="gray">Sin alta</Badge>}
                <button onClick={() => setEditar(p)} className="rounded p-1.5 text-damm-faint transition hover:bg-white/5 hover:text-damm-ink" aria-label="Editar"><IconEdit /></button>
                <button onClick={() => borrar(p)} className="rounded p-1.5 text-damm-faint transition hover:bg-white/5 hover:text-damm-red" aria-label="Eliminar"><IconTrash /></button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-9">
        <div className="mb-1 flex items-baseline justify-between border-b border-damm-line2 pb-2">
          <h2 className="eyebrow text-damm-muted">Entrenadores</h2>
          <span className="text-xs tabular-nums text-damm-faint">{entrenadores.length}</span>
        </div>
        {entrenadores.map((p) => (
          <div key={p.id} className="flex items-center justify-between border-b border-damm-line py-3">
            <span className="text-sm font-medium text-damm-ink">{p.nombre}</span>
            {p.user_id ? <Badge color="green">Alta ✓</Badge> : <Badge color="gray">Sin alta</Badge>}
          </div>
        ))}
      </div>

      {editar && <EditarJugadorModal perfil={editar} onClose={() => setEditar(null)} onSaved={() => { setEditar(null); cargar() }} />}
    </div>
  )
}

function EditarJugadorModal({ perfil, onClose, onSaved }: {
  perfil: Perfil; onClose: () => void; onSaved: () => void
}) {
  const [nombre, setNombre] = useState(perfil.nombre)
  const [posicion, setPosicion] = useState(perfil.posicion ?? '')
  const [guardando, setGuardando] = useState(false)
  async function guardar() {
    if (!nombre.trim()) return
    setGuardando(true)
    await supabase.from('perfiles').update({ nombre: nombre.trim(), posicion: posicion || null }).eq('id', perfil.id)
    setGuardando(false)
    onSaved()
  }
  return (
    <Modal open onClose={onClose} title="Editar jugador">
      <div className="space-y-3">
        <div>
          <label className="label">Nombre</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <label className="label">Posición (solo la ven los entrenadores)</label>
          <input className="input" list="lista-posiciones" value={posicion} onChange={(e) => setPosicion(e.target.value)} placeholder="Ej: Lateral derecho" />
          <datalist id="lista-posiciones">
            {POSICIONES.map((p) => <option key={p} value={p} />)}
          </datalist>
        </div>
        <button className="btn-primary w-full" disabled={!nombre.trim() || guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </Modal>
  )
}
