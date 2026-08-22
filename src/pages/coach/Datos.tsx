import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Evento } from '../../lib/types'
import { Spinner, PageHeader } from '../../components/ui'
import { ETIQUETAS_METRICA, nombreEvento, formatFecha } from '../../lib/utils'

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

  useEffect(() => {
    async function init() {
      const [eRes, jRes] = await Promise.all([
        supabase.from('eventos').select('*').order('fecha', { ascending: false }).limit(200),
        supabase.from('perfiles').select('id,nombre').eq('rol', 'jugador').eq('demo', false),
      ])
      const evs = (eRes.data as Evento[]) ?? []
      setEventos(evs)
      const mp: Record<string, string> = {}
      ;((jRes.data as any[]) ?? []).forEach((j) => (mp[j.id] = j.nombre))
      setJug(mp)
      if (evs.length) setEventoId(evs[0].id)
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

  return (
    <div>
      <PageHeader eyebrow="Datos" title="Distribución por día" subtitle="Cuántos jugadores en cada valor, con nombres." />

      <div className="mb-6">
        <label className="label">Día / evento</label>
        <select className="input" value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
          {eventos.map((e) => (
            <option key={e.id} value={e.id}>{formatFecha(e.fecha)} · {nombreEvento(e)}</option>
          ))}
        </select>
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
