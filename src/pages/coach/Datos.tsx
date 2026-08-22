import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Evento } from '../../lib/types'
import { Spinner, PageHeader } from '../../components/ui'
import { ETIQUETAS_METRICA, nombreEvento, formatFecha, hoyISO } from '../../lib/utils'

const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const WELL_KEYS = ['sueno', 'fatiga', 'dolor_muscular', 'estres', 'animo']
const RPE_KEYS = ['rpe_muscular', 'rpe_respiratorio']
const COLORES: Record<string, string> = {
  sueno: '#5b8def', fatiga: '#4fb286', dolor_muscular: '#e5313f',
  estres: '#e8a13a', animo: '#a78bfa', rpe_muscular: '#e5313f', rpe_respiratorio: '#c9a54e',
}

interface Fila { profile_id: string; [k: string]: any }

export default function Datos() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [eventoId, setEventoId] = useState('')
  const [jug, setJug] = useState<Record<string, string>>({})
  const [wellness, setWellness] = useState<Fila[]>([])
  const [rpe, setRpe] = useState<Fila[]>([])
  const [cargando, setCargando] = useState(true)
  const [cargandoDia, setCargandoDia] = useState(false)
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [diaSel, setDiaSel] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const [eRes, jRes] = await Promise.all([
        supabase.from('eventos').select('*').order('fecha', { ascending: false }).limit(400),
        supabase.from('perfiles').select('id,nombre').eq('rol', 'jugador').eq('demo', false),
      ])
      const evs = (eRes.data as Evento[]) ?? []
      setEventos(evs)
      const mp: Record<string, string> = {}
      ;((jRes.data as any[]) ?? []).forEach((j) => (mp[j.id] = j.nombre))
      setJug(mp)
      // Por defecto: el evento más cercano a hoy (hoy o el más reciente pasado; si no, el próximo).
      const hoy = hoyISO()
      const pordef = evs.find((e) => e.fecha <= hoy) ?? evs[evs.length - 1]
      if (pordef) {
        setEventoId(pordef.id)
        setDiaSel(pordef.fecha)
        setMes(new Date(Number(pordef.fecha.slice(0, 4)), Number(pordef.fecha.slice(5, 7)) - 1, 1))
      }
      setCargando(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!eventoId) return
    async function cargarDia() {
      setCargandoDia(true)
      const [w, r] = await Promise.all([
        supabase.from('wellness').select('profile_id,sueno,fatiga,dolor_muscular,estres,animo').eq('evento_id', eventoId),
        supabase.from('rpe').select('profile_id,rpe_muscular,rpe_respiratorio').eq('evento_id', eventoId),
      ])
      setWellness((w.data as Fila[]) ?? [])
      setRpe((r.data as Fila[]) ?? [])
      setCargandoDia(false)
    }
    cargarDia()
  }, [eventoId])

  if (cargando) return <Spinner label="Cargando…" />

  const ev = eventos.find((e) => e.id === eventoId)

  // Calendario del mes
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

  function seleccionarDia(iso: string) {
    const evs = porDia[iso] ?? []
    if (!evs.length) return
    setDiaSel(iso)
    setEventoId(evs[0].id)
  }

  return (
    <div>
      <PageHeader eyebrow="Datos" title="Distribución por día" subtitle="Elige un día del calendario para ver la distribución." />

      {/* Navegación de mes */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setMes(new Date(y, m - 1, 1))} className="rounded-lg border border-damm-line px-3 py-1.5 text-damm-muted transition hover:bg-white/5 hover:text-damm-ink" aria-label="Mes anterior">‹</button>
        <h2 className="font-display text-lg font-bold tracking-tight">{MESES_LARGO[m]} {y}</h2>
        <button onClick={() => setMes(new Date(y, m + 1, 1))} className="rounded-lg border border-damm-line px-3 py-1.5 text-damm-muted transition hover:bg-white/5 hover:text-damm-ink" aria-label="Mes siguiente">›</button>
      </div>
      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-bold uppercase tracking-wide text-damm-faint">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {celdas.map((iso, i) => {
          if (!iso) return <div key={i} />
          const evs = porDia[iso] ?? []
          const tiene = evs.length > 0
          const partido = evs.some((e) => e.tipo === 'partido')
          const entreno = evs.some((e) => e.tipo === 'entrenamiento')
          const esHoy = iso === hoy
          const sel = iso === diaSel
          return (
            <button
              key={i}
              disabled={!tiene}
              onClick={() => seleccionarDia(iso)}
              className={
                'relative flex aspect-square flex-col rounded-lg border p-1.5 transition ' +
                (sel ? 'border-damm-ink bg-white/[0.06] ' : tiene ? 'border-damm-line bg-white/[0.02] hover:bg-white/[0.06] ' : 'border-transparent ') +
                (esHoy ? 'ring-1 ring-damm-red/40 ' : '') +
                (tiene ? 'cursor-pointer ' : 'cursor-default opacity-40 ')
              }
            >
              <span className={'font-display text-[15px] font-bold leading-none tabular-nums ' + (esHoy ? 'text-damm-red' : sel ? 'text-damm-ink' : 'text-damm-muted')}>
                {parseInt(iso.slice(8, 10), 10)}
              </span>
              {tiene && (
                <span className="absolute bottom-1.5 left-1.5 flex gap-1">
                  {entreno && <span className="h-1.5 w-1.5 rounded-full bg-damm-gold" />}
                  {partido && <span className="h-1.5 w-1.5 rounded-full bg-damm-red" />}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Si el día tiene varios eventos, elegir cuál */}
      {eventosDia.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {eventosDia.map((e) => (
            <button
              key={e.id}
              onClick={() => setEventoId(e.id)}
              className={'chip cursor-pointer border transition ' + (eventoId === e.id ? 'border-damm-red bg-damm-red/15 text-damm-ink' : 'border-damm-line text-damm-faint hover:text-damm-muted')}
            >
              {nombreEvento(e)}
            </button>
          ))}
        </div>
      )}

      <div className="mb-6 mt-4 border-t border-damm-line2 pt-4">
        <p className="eyebrow capitalize text-damm-muted">{ev ? `${formatFecha(ev.fecha)} · ${nombreEvento(ev)}` : 'Selecciona un día con eventos'}</p>
      </div>

      {cargandoDia ? (
        <Spinner />
      ) : wellness.length === 0 && rpe.length === 0 ? (
        <p className="py-2 text-sm text-damm-muted">Sin respuestas para {ev ? nombreEvento(ev) : 'este día'}.</p>
      ) : (
        <div className="space-y-9">
          <div>
            <p className="eyebrow mb-3 border-b border-damm-line2 pb-2 text-damm-muted">Wellness · {wellness.length} respuestas</p>
            <div className="space-y-7">
              {WELL_KEYS.map((k) => <Distribucion key={k} metrica={k} filas={wellness} jug={jug} />)}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-3 border-b border-damm-line2 pb-2 text-damm-muted">RPE · {rpe.length} respuestas</p>
            <div className="space-y-7">
              {RPE_KEYS.map((k) => <Distribucion key={k} metrica={k} filas={rpe} jug={jug} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Distribucion({ metrica, filas, jug }: { metrica: string; filas: Fila[]; jug: Record<string, string> }) {
  const color = COLORES[metrica] ?? '#c9a54e'
  // Agrupa nombres por valor.
  const porValor = new Map<number, string[]>()
  for (const f of filas) {
    const v = f[metrica]
    if (v == null) continue
    if (!porValor.has(v)) porValor.set(v, [])
    porValor.get(v)!.push(jug[f.profile_id] ?? '—')
  }
  const maxCount = Math.max(1, ...[...porValor.values()].map((a) => a.length))
  const valores = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  const conDatos = valores.filter((v) => porValor.has(v))
  const media = filas.length ? (filas.reduce((a, f) => a + (f[metrica] ?? 0), 0) / filas.length) : 0

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-damm-ink">{ETIQUETAS_METRICA[metrica] ?? metrica}</span>
        <span className="text-xs text-damm-faint">media <b className="tabular-nums text-damm-muted">{media.toFixed(1)}</b></span>
      </div>
      {conDatos.length === 0 ? (
        <p className="text-xs text-damm-faint">Sin datos.</p>
      ) : (
        <div className="space-y-1.5">
          {conDatos.map((v) => {
            const nombres = porValor.get(v)!
            return (
              <div key={v} className="flex items-start gap-2.5">
                <span className="mt-1 w-5 shrink-0 text-right font-display text-sm font-bold tabular-nums text-damm-ink">{v}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-4 rounded-sm" style={{ width: `${(nombres.length / maxCount) * 100}%`, backgroundColor: color, minWidth: 6 }} />
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-damm-muted">{nombres.length}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {nombres.map((n, i) => (
                      <span key={i} className="rounded border border-damm-line bg-white/[0.03] px-1.5 py-0.5 text-[11px] text-damm-muted">{n}</span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
