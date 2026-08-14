import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Lesion } from '../../lib/types'
import { Spinner, Section, EmptyState, Badge, Modal } from '../../components/ui'
import { formatFecha, hoyISO } from '../../lib/utils'

interface Jug { id: string; nombre: string }

export default function Lesiones() {
  const [jugadores, setJugadores] = useState<Jug[]>([])
  const [lesiones, setLesiones] = useState<Lesion[]>([])
  const [cargando, setCargando] = useState(true)
  const [nueva, setNueva] = useState(false)

  async function cargar() {
    const [j, l] = await Promise.all([
      supabase.from('perfiles').select('id,nombre').eq('rol', 'jugador').order('nombre'),
      supabase.from('lesiones').select('*').order('fecha_inicio', { ascending: false }),
    ])
    setJugadores((j.data as Jug[]) ?? [])
    setLesiones((l.data as Lesion[]) ?? [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  async function borrar(id: string) {
    await supabase.from('lesiones').delete().eq('id', id)
    cargar()
  }

  if (cargando) return <Spinner />

  const hoy = hoyISO()
  const nombreDe = (id: string) => jugadores.find((x) => x.id === id)?.nombre ?? '—'
  const activa = (l: Lesion) => l.fecha_inicio <= hoy && hoy <= l.fecha_fin

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-black text-damm-ink">Lesiones 🩹</h1>
        <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => setNueva(true)}>+ Nueva</button>
      </div>
      <p className="mb-5 text-sm text-gray-500">Mientras dura la lesión, al jugador no se le pide RPE (el wellness se mantiene) y queda marcado como lesionado.</p>

      <Section title="Lesiones registradas">
        {lesiones.length === 0 ? (
          <EmptyState>No hay lesiones registradas.</EmptyState>
        ) : (
          <div className="card divide-y divide-gray-100">
            {lesiones.map((l) => (
              <div key={l.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-damm-ink">{nombreDe(l.profile_id)}</p>
                  <p className="text-xs capitalize text-gray-400">
                    {formatFecha(l.fecha_inicio)} → {formatFecha(l.fecha_fin)}{l.descripcion ? ` · ${l.descripcion}` : ''}
                  </p>
                </div>
                {activa(l) ? <Badge color="red">Activa</Badge> : <Badge color="gray">Finalizada</Badge>}
                <button onClick={() => borrar(l.id)} className="ml-3 text-gray-300 hover:text-red-500" aria-label="Eliminar">🗑</button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {nueva && <LesionModal jugadores={jugadores} onClose={() => setNueva(false)} onSaved={() => { setNueva(false); cargar() }} />}
    </div>
  )
}

function LesionModal({ jugadores, onClose, onSaved }: {
  jugadores: Jug[]; onClose: () => void; onSaved: () => void
}) {
  const [profileId, setProfileId] = useState('')
  const [inicio, setInicio] = useState(hoyISO())
  const [semanas, setSemanas] = useState('2')
  const [descripcion, setDescripcion] = useState('')
  const [guardando, setGuardando] = useState(false)

  function finCalculado(): string {
    const d = new Date(inicio + 'T00:00:00')
    d.setDate(d.getDate() + Number(semanas) * 7)
    return d.toISOString().slice(0, 10)
  }

  async function guardar() {
    setGuardando(true)
    await supabase.from('lesiones').insert({
      profile_id: profileId, fecha_inicio: inicio, fecha_fin: finCalculado(), descripcion: descripcion || null,
    })
    setGuardando(false)
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title="Nueva lesión">
      <div className="space-y-3">
        <div>
          <label className="label">Jugador</label>
          <select className="input" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
            <option value="">Elige…</option>
            {jugadores.map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
          </select>
        </div>
        <div><label className="label">Fecha de inicio</label><input className="input" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
        <div>
          <label className="label">Duración (semanas)</label>
          <input className="input" type="number" min={1} value={semanas} onChange={(e) => setSemanas(e.target.value)} />
          <p className="mt-1 text-xs text-gray-400">Fin previsto: {formatFecha(finCalculado())}</p>
        </div>
        <div><label className="label">Descripción (opcional)</label><input className="input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: esguince tobillo" /></div>
        <button className="btn-primary w-full" disabled={!profileId || guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Registrar lesión'}</button>
      </div>
    </Modal>
  )
}
