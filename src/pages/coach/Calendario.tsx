import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Evento } from '../../lib/types'
import { Spinner, Modal, IconTrash, PageHeader } from '../../components/ui'
import { hoyISO, nombreEvento, formatFechaLarga } from '../../lib/utils'

const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export default function Calendario() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [cargando, setCargando] = useState(true)
  const [partidoFecha, setPartidoFecha] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')
  const nav = useNavigate()
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [diaSel, setDiaSel] = useState<string | null>(hoyISO())

  async function cargar() {
    const { data } = await supabase.from('eventos').select('*').order('fecha', { ascending: false }).limit(400)
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
    if (!window.confirm('¿Eliminar este evento? Se borrarán también sus wellness, RPE, asistencia y minutos. No se puede deshacer.')) return
    const { error } = await supabase.from('eventos').delete().eq('id', id)
    if (error) { setMensaje('No se pudo eliminar: ' + error.message); return }
    cargar()
  }

  async function crearEntreno(fecha: string) {
    const { data, error } = await supabase.from('eventos').insert({ tipo: 'entrenamiento', fecha, titulo: 'Entrenamiento' }).select('id').single()
    if (error) { setMensaje(error.message); return }
    if (data) nav(`/sesion/${(data as any).id}`)
  }

  if (cargando) return <Spinner />

  const hoy = hoyISO()
  const y = mes.getFullYear()
  const m = mes.getMonth()
  const primerDia = (new Date(y, m, 1).getDay() + 6) % 7 // lunes = 0
  const diasMes = new Date(y, m + 1, 0).getDate()
  const pad = (n: number) => String(n).padStart(2, '0')

  const porDia: Record<string, Evento[]> = {}
  for (const e of eventos) (porDia[e.fecha] ??= []).push(e)

  const celdas: (string | null)[] = []
  for (let i = 0; i < primerDia; i++) celdas.push(null)
  for (let d = 1; d <= diasMes; d++) celdas.push(`${y}-${pad(m + 1)}-${pad(d)}`)

  const eventosDia = diaSel ? porDia[diaSel] ?? [] : []

  return (
    <div>
      <PageHeader
        eyebrow="Planificación"
        title="Calendario"
        subtitle="Entrenamientos (ma · mi · vi) y partidos."
        action={<button className="btn-primary px-3 py-2 text-xs" onClick={() => setPartidoFecha(hoy)}>+ Partido</button>}
      />
      {mensaje && <div className="mb-4 rounded-lg border border-damm-good/30 bg-damm-good/10 px-3 py-2 text-sm text-damm-good">{mensaje}</div>}

      {/* Navegación de mes */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setMes(new Date(y, m - 1, 1))} className="rounded-lg border border-damm-line px-3 py-1.5 text-damm-muted transition hover:bg-white/5 hover:text-damm-ink" aria-label="Mes anterior">‹</button>
        <h2 className="font-display text-lg font-bold tracking-tight">{MESES_LARGO[m]} {y}</h2>
        <button onClick={() => setMes(new Date(y, m + 1, 1))} className="rounded-lg border border-damm-line px-3 py-1.5 text-damm-muted transition hover:bg-white/5 hover:text-damm-ink" aria-label="Mes siguiente">›</button>
      </div>

      {/* Cabecera de días */}
      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-bold uppercase tracking-wide text-damm-faint">{d}</div>
        ))}
      </div>

      {/* Rejilla del mes */}
      <div className="grid grid-cols-7 gap-1.5">
        {celdas.map((iso, i) => {
          if (!iso) return <div key={i} />
          const evs = porDia[iso] ?? []
          const partido = evs.some((e) => e.tipo === 'partido')
          const entreno = evs.some((e) => e.tipo === 'entrenamiento')
          const esHoy = iso === hoy
          const sel = iso === diaSel
          return (
            <button
              key={i}
              onClick={() => { if (evs.length === 1) nav(`/sesion/${evs[0].id}`); else setDiaSel(iso) }}
              className={
                'relative flex aspect-square flex-col rounded-lg border p-1.5 transition ' +
                (sel ? 'border-damm-ink ' : partido ? 'border-damm-red/50 ' : 'border-damm-line ') +
                (esHoy ? 'ring-1 ring-damm-red/40 ' : '') +
                (partido ? 'bg-damm-red/10 ' : 'bg-white/[0.02] hover:bg-white/[0.06] ')
              }
            >
              <span className={'font-display text-[15px] font-bold leading-none tabular-nums ' + (esHoy ? 'text-damm-red' : sel ? 'text-damm-ink' : 'text-damm-muted')}>
                {parseInt(iso.slice(8, 10), 10)}
              </span>
              {(entreno || partido) && (
                <span className="absolute bottom-1.5 left-1.5 flex gap-1">
                  {entreno && <span className="h-1.5 w-1.5 rounded-full bg-damm-gold" />}
                  {partido && <span className="h-1.5 w-1.5 rounded-full bg-damm-red" />}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Leyenda + acción generar */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-4 text-xs text-damm-faint">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-damm-gold" /> Entreno</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-damm-red" /> Partido</span>
        </div>
        <button className="text-xs font-semibold text-damm-gold transition hover:text-damm-gold-dark" onClick={generar}>Generar entrenos · 4 sem. →</button>
      </div>

      {/* Detalle del día seleccionado */}
      <div className="mt-7 border-t border-damm-line2 pt-4">
        <p className="eyebrow mb-3 capitalize text-damm-muted">{diaSel ? formatFechaLarga(diaSel) : 'Selecciona un día'}</p>
        {eventosDia.length === 0 ? (
          <div className="flex flex-wrap items-center gap-2 py-1">
            <span className="mr-1 text-sm text-damm-faint">Sin eventos. Añadir:</span>
            <button className="btn-ghost px-3 py-2 text-xs" onClick={() => diaSel && crearEntreno(diaSel)}>+ Entrenamiento</button>
            <button className="btn-ghost px-3 py-2 text-xs" onClick={() => diaSel && setPartidoFecha(diaSel)}>+ Partido</button>
          </div>
        ) : (
          eventosDia.map((e) => (
            <div
              key={e.id}
              onClick={() => nav(`/sesion/${e.id}`)}
              className="flex cursor-pointer items-center gap-3 border-b border-damm-line py-3 transition hover:bg-white/[0.03]"
            >
              <span className={'h-2 w-2 shrink-0 rounded-full ' + (e.tipo === 'partido' ? 'bg-damm-red' : 'bg-damm-gold')} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-damm-ink">{nombreEvento(e)}</p>
                <p className="text-xs text-damm-faint">{e.tipo === 'partido' ? 'Partido' : 'Entrenamiento'}{e.hora ? ` · ${e.hora.slice(0, 5)}` : ''}</p>
              </div>
              <span className="text-xs font-semibold text-damm-muted">Gestionar →</span>
              <button onClick={(ev) => { ev.stopPropagation(); borrar(e.id) }} className="rounded p-1.5 text-damm-faint transition hover:bg-white/5 hover:text-damm-red" aria-label="Eliminar"><IconTrash /></button>
            </div>
          ))
        )}
      </div>

      {partidoFecha !== null && (
        <PartidoModal
          fechaInicial={partidoFecha}
          onClose={() => setPartidoFecha(null)}
          onSaved={(id) => { setPartidoFecha(null); cargar(); if (id) nav(`/sesion/${id}`) }}
        />
      )}
    </div>
  )
}

function PartidoModal({ fechaInicial, onClose, onSaved }: { fechaInicial: string; onClose: () => void; onSaved: (id?: string) => void }) {
  const [fecha, setFecha] = useState(fechaInicial)
  const [hora, setHora] = useState('')
  const [rival, setRival] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    setGuardando(true)
    const { data } = await supabase.from('eventos').insert({ tipo: 'partido', fecha, hora: hora || null, rival: rival || null, titulo: 'Partido' }).select('id').single()
    setGuardando(false)
    onSaved((data as any)?.id)
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
