import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { Spinner, EmptyState, Section } from './ui'
import { ETIQUETAS_METRICA } from '../lib/utils'

interface Punto {
  fecha: string
  [k: string]: any
}

const WELL_KEYS = ['sueno', 'fatiga', 'dolor_muscular', 'estres', 'animo']
const RPE_KEYS = ['rpe_muscular', 'rpe_respiratorio']

const COLORES: Record<string, string> = {
  sueno: '#5b8def',
  fatiga: '#4fb286',
  dolor_muscular: '#e5313f',
  estres: '#e8a13a',
  animo: '#a78bfa',
  rpe_muscular: '#e5313f',
  rpe_respiratorio: '#c9a54e',
}

// ---- Vista por jugador ----
export default function StatsCharts({ profileId }: { profileId: string }) {
  const [wellness, setWellness] = useState<Punto[] | null>(null)
  const [rpe, setRpe] = useState<Punto[] | null>(null)

  useEffect(() => {
    async function cargar() {
      const { data: w } = await supabase
        .from('wellness')
        .select('sueno,fatiga,dolor_muscular,estres,animo,eventos(fecha)')
        .eq('profile_id', profileId)
      const { data: r } = await supabase
        .from('rpe')
        .select('rpe_muscular,rpe_respiratorio,eventos(fecha)')
        .eq('profile_id', profileId)
      setWellness(mapear(w))
      setRpe(mapear(r))
    }
    cargar()
  }, [profileId])

  if (!wellness || !rpe) return <Spinner />
  return <DosGraficas wellness={wellness} rpe={rpe} tituloW="Evolución de Wellness" tituloR="Evolución de RPE" />
}

// ---- Media de todo el equipo (solo entrenadores) ----
export function TeamStatsCharts() {
  const [wellness, setWellness] = useState<Punto[] | null>(null)
  const [rpe, setRpe] = useState<Punto[] | null>(null)

  useEffect(() => {
    async function cargar() {
      const { data: w } = await supabase
        .from('wellness')
        .select('sueno,fatiga,dolor_muscular,estres,animo,eventos(fecha)')
      const { data: r } = await supabase
        .from('rpe')
        .select('rpe_muscular,rpe_respiratorio,eventos(fecha)')
      setWellness(promediarPorFecha(w, WELL_KEYS))
      setRpe(promediarPorFecha(r, RPE_KEYS))
    }
    cargar()
  }, [])

  if (!wellness || !rpe) return <Spinner />
  return <DosGraficas wellness={wellness} rpe={rpe} tituloW="Media de Wellness · equipo" tituloR="Media de RPE · equipo" />
}

function DosGraficas({ wellness, rpe, tituloW, tituloR }: {
  wellness: Punto[]; rpe: Punto[]; tituloW: string; tituloR: string
}) {
  return (
    <div>
      <Section title={tituloW}>
        {wellness.length === 0 ? <EmptyState>Aún no hay respuestas de wellness.</EmptyState> : <ChartFiltrable data={wellness} keys={WELL_KEYS} />}
      </Section>
      <Section title={tituloR}>
        {rpe.length === 0 ? <EmptyState>Aún no hay respuestas de RPE.</EmptyState> : <ChartFiltrable data={rpe} keys={RPE_KEYS} />}
      </Section>
    </div>
  )
}

// ---- Gráfico con chips de filtro por métrica ----
function ChartFiltrable({ data, keys }: { data: Punto[]; keys: string[] }) {
  const [visible, setVisible] = useState<Set<string>>(new Set(keys))
  const toggle = (k: string) => setVisible((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const media = (k: string) => {
    const vals = data.map((d) => Number(d[k])).filter((n) => !isNaN(n))
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—'
  }
  const fmt = data.map((d) => ({ ...d, fecha: (d.fecha as string).slice(5) }))
  const vis = keys.filter((k) => visible.has(k))

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {keys.map((k) => {
          const on = visible.has(k)
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              className={'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition ' + (on ? 'border-transparent text-damm-ink' : 'border-damm-line text-damm-faint hover:text-damm-muted')}
              style={on ? { background: COLORES[k] + '26' } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={on ? { background: COLORES[k] } : { boxShadow: 'inset 0 0 0 1px currentColor' }} />
              {ETIQUETAS_METRICA[k] ?? k}
              <span className={'tabular-nums ' + (on ? 'text-damm-muted' : 'opacity-70')}>· {media(k)}</span>
            </button>
          )
        })}
      </div>
      <div className="card p-3">
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={fmt} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(243,241,236,0.08)" />
            <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#9b968d' }} stroke="rgba(243,241,236,0.16)" />
            <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#9b968d' }} stroke="rgba(243,241,236,0.16)" />
            <Tooltip
              contentStyle={{ background: '#14161b', border: '1px solid rgba(243,241,236,0.16)', borderRadius: 10, color: '#f3f1ec', fontSize: 12 }}
              labelStyle={{ color: '#9b968d' }}
              cursor={{ stroke: 'rgba(243,241,236,0.2)' }}
              formatter={(value: any, name: any) => [value, ETIQUETAS_METRICA[name] ?? name]}
            />
            {vis.map((k) => (
              <Line key={k} type="monotone" dataKey={k} stroke={COLORES[k]} strokeWidth={2} dot={{ r: 2 }} name={k} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {vis.length === 0 && <p className="pb-1 text-center text-xs text-damm-faint">Toca una métrica para mostrarla.</p>}
      </div>
    </div>
  )
}

function mapear(rows: any[] | null): Punto[] {
  if (!rows) return []
  return rows
    .map((r) => {
      const fecha = r.eventos?.fecha ?? ''
      const { eventos, ...rest } = r
      return { fecha, ...rest } as Punto
    })
    .filter((r) => r.fecha)
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
}

function promediarPorFecha(rows: any[] | null, keys: string[]): Punto[] {
  const porFecha: Record<string, { sum: Record<string, number>; count: Record<string, number> }> = {}
  for (const r of rows ?? []) {
    const fecha = r.eventos?.fecha
    if (!fecha) continue
    const g = (porFecha[fecha] ??= { sum: {}, count: {} })
    for (const k of keys) {
      const v = Number(r[k])
      if (!isNaN(v)) { g.sum[k] = (g.sum[k] ?? 0) + v; g.count[k] = (g.count[k] ?? 0) + 1 }
    }
  }
  return Object.entries(porFecha)
    .map(([fecha, g]) => {
      const o: Punto = { fecha }
      for (const k of keys) o[k] = g.count[k] ? +(g.sum[k] / g.count[k]).toFixed(2) : null
      return o
    })
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
}
