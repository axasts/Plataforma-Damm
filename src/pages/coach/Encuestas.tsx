import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Evento } from '../../lib/types'
import { Spinner, PageHeader } from '../../components/ui'
import { wellnessATiempo, rpeATiempo, nombreEvento, formatFecha, hoyISO } from '../../lib/utils'

interface Jug { id: string; nombre: string }
interface Resp { profile_id: string; evento_id: string; a_tiempo: boolean }
interface Lesion { profile_id: string; fecha_inicio: string; fecha_fin: string }

const DIAS = 7

// Estado de un jugador respecto a una encuesta de un evento.
type Estado = 'ok' | 'tarde_resp' | 'fuera_plazo' | 'pendiente'

export default function Encuestas() {
  const [jug, setJug] = useState<Jug[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [wellness, setWellness] = useState<Resp[]>([])
  const [rpe, setRpe] = useState<Resp[]>([])
  const [desc, setDesc] = useState<Set<string>>(new Set())     // `${evento}:${pid}`
  const [exen, setExen] = useState<Set<string>>(new Set())     // `${evento}:${pid}:${tipo}`
  const [lesiones, setLesiones] = useState<Lesion[]>([])
  const [cargando, setCargando] = useState(true)

  async function cargar() {
    const hoy = hoyISO()
    const desde = new Date(Date.now() - DIAS * 86400000).toISOString().slice(0, 10)
    const { data: evs } = await supabase
      .from('eventos').select('*').gte('fecha', desde).lte('fecha', hoy).order('fecha', { ascending: false })
    const listaEv = (evs as Evento[]) ?? []
    const ids = listaEv.map((e) => e.id)

    const [jRes, wRes, rRes, dRes, xRes, lRes] = await Promise.all([
      supabase.from('perfiles').select('id,nombre').eq('rol', 'jugador').eq('demo', false).order('nombre'),
      supabase.from('wellness').select('profile_id,evento_id,a_tiempo').in('evento_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
      supabase.from('rpe').select('profile_id,evento_id,a_tiempo').in('evento_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
      supabase.from('desconvocados').select('evento_id,profile_id').in('evento_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
      supabase.from('exenciones').select('evento_id,profile_id,tipo').in('evento_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
      supabase.from('lesiones').select('profile_id,fecha_inicio,fecha_fin').lte('fecha_inicio', hoy).gte('fecha_fin', desde),
    ])

    setEventos(listaEv)
    setJug((jRes.data as Jug[]) ?? [])
    setWellness((wRes.data as Resp[]) ?? [])
    setRpe((rRes.data as Resp[]) ?? [])
    setDesc(new Set(((dRes.data as any[]) ?? []).map((x) => `${x.evento_id}:${x.profile_id}`)))
    setExen(new Set(((xRes.data as any[]) ?? []).map((x) => `${x.evento_id}:${x.profile_id}:${x.tipo}`)))
    setLesiones((lRes.data as Lesion[]) ?? [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  if (cargando) return <Spinner label="Cargando encuestas…" />

  const lesionado = (pid: string, fecha: string) =>
    lesiones.some((l) => l.profile_id === pid && l.fecha_inicio <= fecha && fecha <= l.fecha_fin)

  // Para un evento + tipo, clasifica a cada jugador esperado.
  function analizar(ev: Evento, tipo: 'wellness' | 'rpe') {
    const respuestas = tipo === 'wellness' ? wellness : rpe
    const aTiempoAhora = tipo === 'wellness' ? wellnessATiempo(ev) : rpeATiempo(ev)
    const filas: { jug: Jug; estado: Estado }[] = []
    for (const j of jug) {
      // ¿Se le pide? No si desconvocado, exento o lesionado ese día.
      if (desc.has(`${ev.id}:${j.id}`)) continue
      if (exen.has(`${ev.id}:${j.id}:${tipo}`)) continue
      if (lesionado(j.id, ev.fecha)) continue
      const r = respuestas.find((x) => x.evento_id === ev.id && x.profile_id === j.id)
      let estado: Estado
      if (r) estado = r.a_tiempo ? 'ok' : 'tarde_resp'
      else estado = aTiempoAhora ? 'pendiente' : 'fuera_plazo'
      filas.push({ jug: j, estado })
    }
    return filas
  }

  // Total "fuera de plazo" ahora mismo (lo urgente).
  let totalFuera = 0
  for (const ev of eventos) {
    for (const tipo of ['wellness', 'rpe'] as const) {
      totalFuera += analizar(ev, tipo).filter((f) => f.estado === 'fuera_plazo').length
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Control" title="Encuestas" subtitle={`Últimos ${DIAS} días · quién ha respondido y quién no`} />

      <div className="mb-8 border-y border-damm-line px-1 py-4">
        <p className="eyebrow text-damm-faint">Sin responder fuera de plazo</p>
        <p className={'mt-1.5 font-display text-3xl font-bold tabular-nums ' + (totalFuera > 0 ? 'text-damm-red' : 'text-damm-good')}>{totalFuera}</p>
        <p className="mt-0.5 text-xs text-damm-faint">encuestas cuyo plazo ya ha pasado y no se respondieron</p>
      </div>

      {eventos.length === 0 ? (
        <p className="py-2 text-sm text-damm-muted">No hay eventos en los últimos {DIAS} días.</p>
      ) : (
        <div className="space-y-8">
          {eventos.map((ev) => (
            <EventoBloque key={ev.id} ev={ev} wellness={analizar(ev, 'wellness')} rpe={analizar(ev, 'rpe')} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventoBloque({ ev, wellness, rpe }: { ev: Evento; wellness: { jug: Jug; estado: Estado }[]; rpe: { jug: Jug; estado: Estado }[] }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between border-b border-damm-line2 pb-2">
        <h2 className="text-sm font-bold text-damm-ink">{nombreEvento(ev)}</h2>
        <Link to={`/sesion/${ev.id}`} className="text-xs capitalize text-damm-faint transition hover:text-damm-red">{formatFecha(ev.fecha)} →</Link>
      </div>
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Columna titulo="Wellness" filas={wellness} />
        <Columna titulo="RPE" filas={rpe} />
      </div>
    </div>
  )
}

function Columna({ titulo, filas }: { titulo: string; filas: { jug: Jug; estado: Estado }[] }) {
  const fuera = filas.filter((f) => f.estado === 'fuera_plazo')
  const pend = filas.filter((f) => f.estado === 'pendiente')
  const tarde = filas.filter((f) => f.estado === 'tarde_resp')
  const ok = filas.filter((f) => f.estado === 'ok')
  const respondidas = ok.length + tarde.length

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="eyebrow text-damm-muted">{titulo}</span>
        <span className="text-xs tabular-nums text-damm-faint">{respondidas}/{filas.length} respondidas</span>
      </div>
      {filas.length === 0 ? (
        <p className="text-xs text-damm-faint">No se pide a nadie (todos exentos/lesionados/no convocados).</p>
      ) : (
        <div className="space-y-2.5">
          <Grupo label="Fuera de plazo" tone="bad" items={fuera.map((f) => f.jug.nombre)} />
          <Grupo label="Pendiente (aún a tiempo)" tone="mut" items={pend.map((f) => f.jug.nombre)} />
          <Grupo label="Respondió tarde" tone="warn" items={tarde.map((f) => f.jug.nombre)} />
          {fuera.length === 0 && pend.length === 0 && (
            <p className="text-xs font-semibold text-damm-good">Todas respondidas ✓</p>
          )}
        </div>
      )}
    </div>
  )
}

function Grupo({ label, tone, items }: { label: string; tone: 'bad' | 'warn' | 'mut'; items: string[] }) {
  if (items.length === 0) return null
  const dot = { bad: 'bg-damm-red', warn: 'bg-damm-gold', mut: 'bg-white/25' }[tone]
  const txt = { bad: 'text-damm-red', warn: 'text-damm-gold', mut: 'text-damm-faint' }[tone]
  return (
    <div>
      <p className={'mb-1 text-[11px] font-semibold uppercase tracking-wide ' + txt}>{label} · {items.length}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((n) => (
          <span key={n} className="flex items-center gap-1.5 rounded-md border border-damm-line bg-white/[0.03] px-2 py-1 text-xs text-damm-ink">
            <span className={'h-1.5 w-1.5 rounded-full ' + dot} />{n}
          </span>
        ))}
      </div>
    </div>
  )
}
