import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Evento } from '../../lib/types'
import { Spinner, Section, EmptyState } from '../../components/ui'
import { formatFecha, nombreEvento } from '../../lib/utils'

interface Jug { id: string; nombre: string }
type Estado = 'ok' | 'lesionado' | 'no_vino'

export default function Asistencia() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [eventoId, setEventoId] = useState('')
  const [jugadores, setJugadores] = useState<Jug[]>([])
  const [estados, setEstados] = useState<Record<string, Estado>>({})
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function init() {
      const [e, j] = await Promise.all([
        supabase.from('eventos').select('*').lte('fecha', new Date(Date.now() + 86400000).toISOString().slice(0, 10)).order('fecha', { ascending: false }).limit(40),
        supabase.from('perfiles').select('id,nombre').eq('rol', 'jugador').order('nombre'),
      ])
      const evs = (e.data as Evento[]) ?? []
      setEventos(evs)
      setJugadores((j.data as Jug[]) ?? [])
      if (evs[0]) setEventoId(evs[0].id)
      setCargando(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!eventoId) return
    supabase.from('asistencia').select('profile_id,estado').eq('evento_id', eventoId).then(({ data }) => {
      const m: Record<string, Estado> = {}
      ;((data as any[]) ?? []).forEach((r) => (m[r.profile_id] = r.estado))
      setEstados(m)
    })
  }, [eventoId])

  async function cambiar(pid: string, estado: Estado) {
    setEstados((s) => ({ ...s, [pid]: estado }))
    if (estado === 'ok') {
      await supabase.from('asistencia').delete().eq('evento_id', eventoId).eq('profile_id', pid)
    } else {
      await supabase.from('asistencia').upsert({ evento_id: eventoId, profile_id: pid, estado }, { onConflict: 'evento_id,profile_id' })
    }
  }

  if (cargando) return <Spinner />

  return (
    <div>
      <h1 className="mb-4 text-lg font-black text-damm-ink">Asistencia ✅</h1>

      {eventos.length === 0 ? (
        <EmptyState>No hay eventos. Genera entrenamientos o añade un partido en Calendario.</EmptyState>
      ) : (
        <>
          <div className="mb-5">
            <label className="label">Evento</label>
            <select className="input" value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
              {eventos.map((e) => (
                <option key={e.id} value={e.id}>{nombreEvento(e)} · {formatFecha(e.fecha)}</option>
              ))}
            </select>
          </div>

          <Section title="Por defecto todos están OK — marca solo las excepciones">
            <div className="card divide-y divide-gray-100">
              {jugadores.map((j) => {
                const est = estados[j.id] ?? 'ok'
                return (
                  <div key={j.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm font-medium text-damm-ink">{j.nombre}</span>
                    <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 text-xs font-semibold">
                      <Opt actual={est} valor="ok" label="OK" color="green" onClick={() => cambiar(j.id, 'ok')} />
                      <Opt actual={est} valor="lesionado" label="Lesión" color="gold" onClick={() => cambiar(j.id, 'lesionado')} />
                      <Opt actual={est} valor="no_vino" label="No vino" color="red" onClick={() => cambiar(j.id, 'no_vino')} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        </>
      )}
    </div>
  )
}

function Opt({ actual, valor, label, color, onClick }: {
  actual: string; valor: string; label: string; color: 'green' | 'gold' | 'red'; onClick: () => void
}) {
  const activo = actual === valor
  const cls = { green: 'bg-green-500 text-white', gold: 'bg-damm-gold text-damm-ink', red: 'bg-red-500 text-white' }[color]
  return (
    <button onClick={onClick} className={'rounded-md px-2.5 py-1 ' + (activo ? cls : 'text-gray-500')}>{label}</button>
  )
}
