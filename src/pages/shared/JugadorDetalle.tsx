import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Spinner, EmptyState, Section, Badge } from '../../components/ui'
import { formatFecha, hoyISO, nombreEvento } from '../../lib/utils'
import StatsCharts from '../../components/StatsCharts'
import { Evento } from '../../lib/types'

interface Mov {
  fecha: string
  puntos: number
  motivo: string | null
  created_at: string
}

export default function JugadorDetalle() {
  const { id } = useParams()
  const { esEntrenador } = useAuth()
  const nav = useNavigate()
  const [nombre, setNombre] = useState('')
  const [movs, setMovs] = useState<Mov[] | null>(null)

  useEffect(() => {
    if (!id) return
    supabase.rpc('get_jugadores_publicos').then(({ data }) => {
      const j = (data as any[])?.find((x) => x.id === id)
      setNombre(j?.nombre ?? 'Jugador')
    })
    supabase.rpc('get_desglose_jugador', { p_id: id }).then(({ data }) => setMovs((data as Mov[]) ?? []))
  }, [id])

  if (!movs || !id) return <Spinner />

  const sumados = movs.filter((m) => m.puntos > 0).reduce((a, m) => a + m.puntos, 0)
  const restados = movs.filter((m) => m.puntos < 0).reduce((a, m) => a + m.puntos, 0)
  const total = sumados + restados

  return (
    <div>
      <button onClick={() => nav(-1)} className="mb-3 text-sm text-damm-faint transition hover:text-damm-muted">← Volver</button>
      <h1 className="font-display text-2xl font-bold tracking-tight">{nombre}</h1>

      <div className="my-5 grid grid-cols-3 divide-x divide-damm-line border-y border-damm-line">
        <div className="px-3 py-4 text-center">
          <p className="eyebrow text-damm-faint">Total</p>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-damm-ink">{total}</p>
        </div>
        <div className="px-3 py-4 text-center">
          <p className="eyebrow text-damm-faint">Sumados</p>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-damm-good">+{sumados}</p>
        </div>
        <div className="px-3 py-4 text-center">
          <p className="eyebrow text-damm-faint">Restados</p>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-damm-red">{restados}</p>
        </div>
      </div>

      <Section title="Movimientos de puntos">
        {movs.length === 0 ? (
          <EmptyState>Sin movimientos todavía.</EmptyState>
        ) : (
          <div className="card divide-y divide-white/5">
            {movs.map((m, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-damm-ink">{m.motivo || 'Ajuste manual'}</p>
                  <p className="text-xs capitalize text-damm-faint">{formatFecha(m.fecha)}</p>
                </div>
                <Badge color={m.puntos >= 0 ? 'green' : 'red'}>
                  {m.puntos > 0 ? '+' : ''}{m.puntos}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Section>

      {esEntrenador && (
        <div className="mt-8">
          <PerfilEntrenador id={id} />
        </div>
      )}
    </div>
  )
}

// ============================================================================
//  Perfil completo (solo entrenadores): minutos, partidos, asistencia, gráficas
// ============================================================================
interface AsisRow { evento_id: string; estado: 'ok' | 'lesionado' | 'no_vino' }
interface MinRow { evento_id: string; minutos: number }

function PerfilEntrenador({ id }: { id: string }) {
  const [posicion, setPosicion] = useState<string | null>(null)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [asis, setAsis] = useState<AsisRow[]>([])
  const [desc, setDesc] = useState<Set<string>>(new Set())
  const [mins, setMins] = useState<MinRow[]>([])
  const [nWellness, setNWellness] = useState(0)
  const [nRpe, setNRpe] = useState(0)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      const hoy = hoyISO()
      const [pRes, eRes, aRes, dRes, mRes, wRes, rRes] = await Promise.all([
        supabase.from('perfiles').select('posicion').eq('id', id).maybeSingle(),
        supabase.from('eventos').select('id,tipo,fecha,hora,titulo,rival').lte('fecha', hoy).order('fecha', { ascending: false }).limit(400),
        supabase.from('asistencia').select('evento_id,estado').eq('profile_id', id),
        supabase.from('desconvocados').select('evento_id').eq('profile_id', id),
        supabase.from('minutos_jugados').select('evento_id,minutos').eq('profile_id', id),
        supabase.from('wellness').select('id').eq('profile_id', id),
        supabase.from('rpe').select('id').eq('profile_id', id),
      ])
      setPosicion((pRes.data as any)?.posicion ?? null)
      setEventos((eRes.data as Evento[]) ?? [])
      setAsis((aRes.data as AsisRow[]) ?? [])
      setDesc(new Set(((dRes.data as any[]) ?? []).map((x) => x.evento_id)))
      setMins((mRes.data as MinRow[]) ?? [])
      setNWellness((wRes.data as any[])?.length ?? 0)
      setNRpe((rRes.data as any[])?.length ?? 0)
      setCargando(false)
    }
    cargar()
  }, [id])

  if (cargando) return <Spinner label="Cargando perfil…" />

  const entrenos = eventos.filter((e) => e.tipo === 'entrenamiento')
  const partidos = eventos.filter((e) => e.tipo === 'partido')
  const asisMap = new Map(asis.map((a) => [a.evento_id, a.estado]))
  const minMap = new Map(mins.map((m) => [m.evento_id, m.minutos]))

  // Asistencia a entrenamientos (por defecto 'ok' si no hay excepción).
  let ok = 0, les = 0, noVino = 0
  for (const e of entrenos) {
    const est = asisMap.get(e.id) ?? 'ok'
    if (est === 'ok') ok++; else if (est === 'lesionado') les++; else noVino++
  }
  const pctAsis = entrenos.length ? Math.round((ok / entrenos.length) * 100) : 0

  // Partidos
  const minutosTotales = mins.reduce((a, m) => a + m.minutos, 0)
  const partidosJugados = partidos.filter((p) => (minMap.get(p.id) ?? 0) > 0).length
  const convocados = partidos.filter((p) => !desc.has(p.id)).length

  return (
    <div className="space-y-8">
      {posicion && <p className="-mt-4 text-sm text-damm-muted">{posicion}</p>}

      {/* Métricas clave */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-damm-line bg-damm-line sm:grid-cols-4">
        <Metric label="Partidos jugados" value={partidosJugados} foot={`de ${partidos.length}`} />
        <Metric label="Minutos totales" value={minutosTotales} foot="en partidos" />
        <Metric label="Asistencia" value={`${pctAsis}%`} foot={`${ok}/${entrenos.length} entrenos`} />
        <Metric label="Convocatorias" value={convocados} foot={`de ${partidos.length} partidos`} />
      </div>

      {/* Últimos partidos con minutos */}
      <Section title="Últimos partidos · minutos">
        {partidos.length === 0 ? (
          <EmptyState>Sin partidos todavía.</EmptyState>
        ) : (
          <div className="card divide-y divide-white/5">
            {partidos.slice(0, 12).map((p) => {
              const m = minMap.get(p.id)
              const noConv = desc.has(p.id)
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-damm-ink">{nombreEvento(p)}</p>
                    <p className="text-xs capitalize text-damm-faint">{formatFecha(p.fecha)}</p>
                  </div>
                  {noConv ? (
                    <span className="text-xs font-semibold text-damm-faint">No convocado</span>
                  ) : (
                    <span className="font-display text-base font-bold tabular-nums text-damm-ink">{m != null ? `${m}′` : '—'}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* Asistencia a entrenamientos */}
      <Section title="Asistencia · entrenamientos">
        <div className="grid grid-cols-3 divide-x divide-damm-line rounded-xl border border-damm-line">
          <div className="px-3 py-3.5 text-center">
            <p className="eyebrow text-damm-faint">Asistió</p>
            <p className="mt-1.5 font-display text-xl font-bold tabular-nums text-damm-good">{ok}</p>
          </div>
          <div className="px-3 py-3.5 text-center">
            <p className="eyebrow text-damm-faint">Lesión</p>
            <p className="mt-1.5 font-display text-xl font-bold tabular-nums text-damm-gold">{les}</p>
          </div>
          <div className="px-3 py-3.5 text-center">
            <p className="eyebrow text-damm-faint">No vino</p>
            <p className="mt-1.5 font-display text-xl font-bold tabular-nums text-damm-red">{noVino}</p>
          </div>
        </div>
      </Section>

      {/* Encuestas registradas */}
      <Section title="Encuestas registradas">
        <div className="grid grid-cols-2 divide-x divide-damm-line rounded-xl border border-damm-line">
          <div className="px-3 py-3.5 text-center">
            <p className="eyebrow text-damm-faint">Wellness</p>
            <p className="mt-1.5 font-display text-xl font-bold tabular-nums text-damm-ink">{nWellness}</p>
          </div>
          <div className="px-3 py-3.5 text-center">
            <p className="eyebrow text-damm-faint">RPE</p>
            <p className="mt-1.5 font-display text-xl font-bold tabular-nums text-damm-ink">{nRpe}</p>
          </div>
        </div>
      </Section>

      {/* Evolución wellness / RPE */}
      <StatsCharts profileId={id} />
    </div>
  )
}

function Metric({ label, value, foot }: { label: string; value: number | string; foot: string }) {
  return (
    <div className="bg-damm-bg px-3 py-4">
      <p className="eyebrow text-damm-faint">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-damm-ink">{value}</p>
      <p className="mt-0.5 text-xs text-damm-faint">{foot}</p>
    </div>
  )
}
