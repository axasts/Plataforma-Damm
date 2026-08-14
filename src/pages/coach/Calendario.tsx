import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Evento } from '../../lib/types'
import { Spinner, Section, EmptyState, Badge, Modal } from '../../components/ui'
import { formatFecha, hoyISO, nombreEvento } from '../../lib/utils'

interface Jug { id: string; nombre: string }

export default function Calendario() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [cargando, setCargando] = useState(true)
  const [nuevoPartido, setNuevoPartido] = useState(false)
  const [gestionar, setGestionar] = useState<Evento | null>(null)
  const [mensaje, setMensaje] = useState('')

  async function cargar() {
    const { data } = await supabase.from('eventos').select('*').order('fecha', { ascending: false }).limit(80)
    setEventos((data as Evento[]) ?? [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  async function generar() {
    const desde = hoyISO()
    const d = new Date()
    d.setDate(d.getDate() + 28)
    const hasta = d.toISOString().slice(0, 10)
    const { data, error } = await supabase.rpc('generar_entrenamientos', { desde, hasta })
    if (error) { setMensaje(error.message); return }
    setMensaje(`✅ ${data} entrenamientos generados (próximas 4 semanas).`)
    cargar()
  }

  async function borrar(id: string) {
    await supabase.from('eventos').delete().eq('id', id)
    cargar()
  }

  if (cargando) return <Spinner />

  return (
    <div>
      <h1 className="mb-4 text-lg font-black text-damm-ink">Calendario 📅</h1>
      {mensaje && <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{mensaje}</div>}

      <div className="mb-5 flex gap-2">
        <button className="btn-primary flex-1" onClick={generar}>Generar entrenamientos (4 sem.)</button>
        <button className="btn-gold flex-1" onClick={() => setNuevoPartido(true)}>+ Añadir partido</button>
      </div>

      <Section title="Eventos">
        {eventos.length === 0 ? (
          <EmptyState>No hay eventos. Genera entrenamientos o añade un partido.</EmptyState>
        ) : (
          <div className="card divide-y divide-gray-100">
            {eventos.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-damm-ink">{nombreEvento(e)}</p>
                  <p className="text-xs capitalize text-gray-400">{formatFecha(e.fecha)}{e.hora ? ` · ${e.hora.slice(0, 5)}` : ''}</p>
                </div>
                <Badge color={e.tipo === 'partido' ? 'gold' : 'gray'}>{e.tipo === 'partido' ? 'Partido' : 'Entreno'}</Badge>
                {e.tipo === 'partido' && (
                  <button onClick={() => setGestionar(e)} className="ml-3 text-xs font-semibold text-damm-red">Convocatoria</button>
                )}
                <button onClick={() => borrar(e.id)} className="ml-3 text-gray-300 hover:text-red-500" aria-label="Eliminar">🗑</button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {nuevoPartido && <PartidoModal onClose={() => setNuevoPartido(false)} onSaved={() => { setNuevoPartido(false); cargar() }} />}
      {gestionar && <ConvocatoriaModal evento={gestionar} onClose={() => setGestionar(null)} />}
    </div>
  )
}

function PartidoModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [fecha, setFecha] = useState(hoyISO())
  const [hora, setHora] = useState('')
  const [rival, setRival] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    setGuardando(true)
    await supabase.from('eventos').insert({ tipo: 'partido', fecha, hora: hora || null, rival: rival || null, titulo: 'Partido' })
    setGuardando(false)
    onSaved()
  }
  return (
    <Modal open onClose={onClose} title="Nuevo partido">
      <div className="space-y-3">
        <div><label className="label">Fecha</label><input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
        <div><label className="label">Hora (convocatoria / partido)</label><input className="input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></div>
        <div><label className="label">Rival (opcional)</label><input className="input" value={rival} onChange={(e) => setRival(e.target.value)} placeholder="Ej: Sant Just" /></div>
        <button className="btn-primary w-full" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Crear partido'}</button>
      </div>
    </Modal>
  )
}

function ConvocatoriaModal({ evento, onClose }: { evento: Evento; onClose: () => void }) {
  const [jugadores, setJugadores] = useState<Jug[]>([])
  const [desc, setDesc] = useState<Set<string>>(new Set())
  const [cargando, setCargando] = useState(true)

  async function cargar() {
    const [j, d] = await Promise.all([
      supabase.from('perfiles').select('id,nombre').eq('rol', 'jugador').order('nombre'),
      supabase.from('desconvocados').select('profile_id').eq('evento_id', evento.id),
    ])
    setJugadores((j.data as Jug[]) ?? [])
    setDesc(new Set(((d.data as any[]) ?? []).map((x) => x.profile_id)))
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  async function toggle(pid: string) {
    if (desc.has(pid)) {
      await supabase.from('desconvocados').delete().eq('evento_id', evento.id).eq('profile_id', pid)
      setDesc((s) => { const n = new Set(s); n.delete(pid); return n })
    } else {
      await supabase.from('desconvocados').insert({ evento_id: evento.id, profile_id: pid })
      setDesc((s) => new Set(s).add(pid))
    }
  }

  return (
    <Modal open onClose={onClose} title="No convocados">
      <p className="mb-4 text-sm text-gray-500">Marca los que NO están convocados. A esos no se les pedirá wellness ni RPE de este partido.</p>
      {cargando ? <Spinner /> : (
        <div className="flex flex-wrap gap-2">
          {jugadores.map((j) => {
            const fuera = desc.has(j.id)
            return (
              <button key={j.id} onClick={() => toggle(j.id)}
                className={'chip cursor-pointer border ' + (fuera ? 'bg-gray-300 text-gray-600 border-gray-300 line-through' : 'bg-white text-damm-ink border-gray-200')}>
                {j.nombre}
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
