import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { Spinner, EmptyState, Section, Badge } from './ui'
import { ETIQUETAS_METRICA } from '../lib/utils'

interface Punto {
  fecha: string
  [k: string]: number | string
}

const COLORES: Record<string, string> = {
  sueno: '#2563eb',
  fatiga: '#16a34a',
  dolor_muscular: '#dc2626',
  estres: '#d97706',
  animo: '#7c3aed',
  rpe_muscular: '#C8102E',
  rpe_respiratorio: '#F4C300',
}

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

  return (
    <div>
      <Section title="🌙 Evolución de Wellness">
        {wellness.length === 0 ? (
          <EmptyState>Aún no hay respuestas de wellness.</EmptyState>
        ) : (
          <Grafica data={wellness} keys={['sueno', 'fatiga', 'dolor_muscular', 'estres', 'animo']} />
        )}
        {wellness.length > 0 && <Promedios data={wellness} keys={['sueno', 'fatiga', 'dolor_muscular', 'estres', 'animo']} />}
      </Section>

      <Section title="🔥 Evolución de RPE">
        {rpe.length === 0 ? (
          <EmptyState>Aún no hay respuestas de RPE.</EmptyState>
        ) : (
          <Grafica data={rpe} keys={['rpe_muscular', 'rpe_respiratorio']} />
        )}
        {rpe.length > 0 && <Promedios data={rpe} keys={['rpe_muscular', 'rpe_respiratorio']} />}
      </Section>
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

function Grafica({ data, keys }: { data: Punto[]; keys: string[] }) {
  const fmt = data.map((d) => ({ ...d, fecha: (d.fecha as string).slice(5) }))
  return (
    <div className="card p-3">
      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={fmt} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => ETIQUETAS_METRICA[v] ?? v} />
          {keys.map((k) => (
            <Line key={k} type="monotone" dataKey={k} stroke={COLORES[k]} strokeWidth={2} dot={{ r: 2 }} name={k} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function Promedios({ data, keys }: { data: Punto[]; keys: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {keys.map((k) => {
        const vals = data.map((d) => Number(d[k])).filter((n) => !isNaN(n))
        const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—'
        return (
          <Badge key={k} color="gray">
            {ETIQUETAS_METRICA[k]}: <span className="ml-1 font-bold">{avg}</span>
          </Badge>
        )
      })}
    </div>
  )
}
