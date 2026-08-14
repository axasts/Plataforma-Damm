import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Motivo } from '../../lib/types'
import { Spinner, Section, EmptyState, Badge, Modal } from '../../components/ui'
import { formatFecha, hoyISO } from '../../lib/utils'

interface Jug { id: string; nombre: string }
interface Mov { id: string; profile_id: string; puntos: number; motivo: string | null; fecha: string; created_at: string }

export default function Puntos() {
  const { perfil } = useAuth()
  const [jugadores, setJugadores] = useState<Jug[]>([])
  const [motivos, setMotivos] = useState<Motivo[]>([])
  const [movs, setMovs] = useState<Mov[]>([])
  const [cargando, setCargando] = useState(true)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [cat, setCat] = useState<'entrenamiento' | 'partido'>('entrenamiento')
  const [manual, setManual] = useState(false)
  const [mensaje, setMensaje] = useState('')

  async function cargar() {
    const [j, m, mv] = await Promise.all([
      supabase.from('perfiles').select('id,nombre').eq('rol', 'jugador').order('nombre'),
      supabase.from('motivos_puntos').select('*').eq('activo', true).order('categoria'),
      supabase.from('puntos').select('id,profile_id,puntos,motivo,fecha,created_at').order('created_at', { ascending: false }).limit(40),
    ])
    setJugadores((j.data as Jug[]) ?? [])
    setMotivos((m.data as Motivo[]) ?? [])
    setMovs((mv.data as Mov[]) ?? [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  const nombreDe = (id: string) => jugadores.find((x) => x.id === id)?.nombre ?? '—'

  function toggle(id: string) {
    setSel((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  async function aplicar(puntos: number, motivo: string, motivo_id: string | null) {
    if (sel.size === 0) { setMensaje('Selecciona al menos un jugador.'); return }
    const filas = [...sel].map((pid) => ({
      profile_id: pid, puntos, motivo, motivo_id, fecha: hoyISO(), registrado_por: perfil?.id ?? null,
    }))
    const { error } = await supabase.from('puntos').insert(filas)
    if (error) { setMensaje(error.message); return }
    setMensaje(`✅ Aplicado a ${sel.size} jugador${sel.size > 1 ? 'es' : ''}.`)
    setSel(new Set())
    cargar()
  }

  async function borrar(id: string) {
    await supabase.from('puntos').delete().eq('id', id)
    cargar()
  }

  if (cargando) return <Spinner />

  return (
    <div>
      <h1 className="mb-4 text-lg font-black text-damm-ink">Registrar puntos ⚽</h1>

      {mensaje && <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{mensaje}</div>}

      <Section title={`1 · Jugadores (${sel.size} seleccionados)`} action={
        <button className="text-xs font-semibold text-damm-red" onClick={() => setSel(new Set())}>Limpiar</button>
      }>
        <div className="flex flex-wrap gap-2">
          {jugadores.map((j) => (
            <button
              key={j.id}
              onClick={() => toggle(j.id)}
              className={'chip cursor-pointer border ' + (sel.has(j.id) ? 'bg-damm-red text-white border-damm-red' : 'bg-white text-gray-600 border-gray-200')}
            >
              {j.nombre}
            </button>
          ))}
        </div>
      </Section>

      <Section title="2 · Elige la sanción" action={
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-xs font-semibold">
          <button className={'rounded px-2 py-1 ' + (cat === 'entrenamiento' ? 'bg-white text-damm-red shadow' : 'text-gray-500')} onClick={() => setCat('entrenamiento')}>Entreno</button>
          <button className={'rounded px-2 py-1 ' + (cat === 'partido' ? 'bg-white text-damm-red shadow' : 'text-gray-500')} onClick={() => setCat('partido')}>Partido</button>
        </div>
      }>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {motivos.filter((m) => m.categoria === cat).map((m) => (
            <button
              key={m.id}
              onClick={() => aplicar(m.puntos, m.nombre, m.id)}
              disabled={sel.size === 0}
              className="card flex items-center justify-between p-3 text-left hover:border-damm-red/40 disabled:opacity-50"
            >
              <span className="text-sm text-damm-ink">{m.nombre}</span>
              <Badge color={m.puntos >= 0 ? 'green' : 'red'}>{m.puntos > 0 ? '+' : ''}{m.puntos}</Badge>
            </button>
          ))}
        </div>
        <button className="btn-gold mt-3 w-full" onClick={() => setManual(true)} disabled={sel.size === 0}>
          + Puntos de ejercicio / ajuste manual
        </button>
      </Section>

      <Section title="Últimos movimientos">
        {movs.length === 0 ? (
          <EmptyState>Todavía no hay movimientos.</EmptyState>
        ) : (
          <div className="card divide-y divide-gray-100">
            {movs.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-damm-ink">{nombreDe(m.profile_id)}</p>
                  <p className="truncate text-xs text-gray-400">{m.motivo || 'Manual'} · {formatFecha(m.fecha)}</p>
                </div>
                <Badge color={m.puntos >= 0 ? 'green' : 'red'}>{m.puntos > 0 ? '+' : ''}{m.puntos}</Badge>
                <button onClick={() => borrar(m.id)} className="ml-3 text-gray-300 hover:text-red-500" aria-label="Eliminar">🗑</button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <ManualModal
        open={manual}
        onClose={() => setManual(false)}
        count={sel.size}
        onSubmit={(puntos, concepto) => { aplicar(puntos, concepto, null); setManual(false) }}
      />
    </div>
  )
}

function ManualModal({ open, onClose, count, onSubmit }: {
  open: boolean; onClose: () => void; count: number; onSubmit: (p: number, c: string) => void
}) {
  const [puntos, setPuntos] = useState('')
  const [concepto, setConcepto] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="Puntos manuales">
      <p className="mb-4 text-sm text-gray-500">Se aplicará a {count} jugador{count > 1 ? 'es' : ''}. Usa negativo para restar (ej: -3) y positivo para sumar (ej: 5).</p>
      <div className="space-y-3">
        <div>
          <label className="label">Puntos (con signo)</label>
          <input className="input" type="number" value={puntos} onChange={(e) => setPuntos(e.target.value)} placeholder="Ej: 5 o -3" />
        </div>
        <div>
          <label className="label">Concepto</label>
          <input className="input" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: Ejercicio de rondos" />
        </div>
        <button
          className="btn-primary w-full"
          disabled={!puntos || !concepto}
          onClick={() => onSubmit(parseInt(puntos, 10), concepto)}
        >
          Aplicar
        </button>
      </div>
    </Modal>
  )
}
