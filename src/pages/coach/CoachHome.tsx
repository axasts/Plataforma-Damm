import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ReglaAlerta } from '../../lib/types'
import { Spinner, EmptyState, Section, Badge } from '../../components/ui'
import { ETIQUETAS_METRICA, formatFecha } from '../../lib/utils'

interface Jug { id: string; nombre: string; posicion: string | null }
interface Resp { profile_id: string; fecha: string; [k: string]: any }
interface Resumen { profile_id: string; nombre: string; wellness_pend: number; rpe_pend: number }
interface Alerta { nombre: string; metrica: string; valor: number; fecha: string }

const DIAS_ALERTA = 4
const DIAS_CARGA = 7

export default function CoachHome() {
  const [jug, setJug] = useState<Record<string, Jug>>({})
  const [wellness, setWellness] = useState<Resp[]>([])
  const [rpe, setRpe] = useState<Resp[]>([])
  const [reglas, setReglas] = useState<ReglaAlerta[]>([])
  const [resumen, setResumen] = useState<Resumen[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      const [jRes, wRes, rRes, reRes, pRes] = await Promise.all([
        supabase.from('perfiles').select('id,nombre,posicion').eq('rol', 'jugador'),
        supabase.from('wellness').select('profile_id,sueno,fatiga,dolor_muscular,estres,animo,eventos(fecha)').order('created_at', { ascending: false }).limit(150),
        supabase.from('rpe').select('profile_id,rpe_muscular,rpe_respiratorio,eventos(fecha)').order('created_at', { ascending: false }).limit(150),
        supabase.from('reglas_alerta').select('*').eq('activa', true),
        supabase.rpc('get_resumen_pendientes'),
      ])
      const mapa: Record<string, Jug> = {}
      ;((jRes.data as Jug[]) ?? []).forEach((j) => (mapa[j.id] = j))
      setJug(mapa)
      setWellness(aplanar(wRes.data))
      setRpe(aplanar(rRes.data))
      setReglas((reRes.data as ReglaAlerta[]) ?? [])
      setResumen((pRes.data as Resumen[]) ?? [])
      setCargando(false)
    }
    cargar()
  }, [])

  if (cargando) return <Spinner label="Cargando panel…" />

  // ---- Alertas ----
  const limiteAlerta = diasAtras(DIAS_ALERTA)
  const alertas: Alerta[] = []
  const todas = [...wellness, ...rpe]
  for (const r of todas) {
    if (r.fecha < limiteAlerta) continue
    for (const rg of reglas) {
      const v = r[rg.metrica]
      if (v === undefined || v === null) continue
      const disp = rg.operador === '>=' ? v >= rg.valor : v <= rg.valor
      if (disp) {
        alertas.push({ nombre: jug[r.profile_id]?.nombre ?? '—', metrica: rg.metrica, valor: v, fecha: r.fecha })
      }
    }
  }

  // ---- Pendientes ----
  const conPendientes = resumen.filter((r) => r.wellness_pend + r.rpe_pend > 0)
  const totalPend = resumen.reduce((a, r) => a + r.wellness_pend + r.rpe_pend, 0)

  // ---- Carga por posición ----
  const limiteCarga = diasAtras(DIAS_CARGA)
  const porPos: Record<string, { rpe: number[]; fatiga: number[] }> = {}
  for (const r of rpe) {
    if (r.fecha < limiteCarga) continue
    const pos = jug[r.profile_id]?.posicion ?? 'Sin posición'
    ;(porPos[pos] ??= { rpe: [], fatiga: [] }).rpe.push(r.rpe_muscular)
  }
  for (const r of wellness) {
    if (r.fecha < limiteCarga) continue
    const pos = jug[r.profile_id]?.posicion ?? 'Sin posición'
    ;(porPos[pos] ??= { rpe: [], fatiga: [] }).fatiga.push(r.fatiga)
  }

  return (
    <div>
      <Section title="🚨 Alertas recientes" action={<span className="text-xs text-gray-400">últimos {DIAS_ALERTA} días</span>}>
        {alertas.length === 0 ? (
          <EmptyState>Sin picos que superen tus umbrales. 👌</EmptyState>
        ) : (
          <div className="space-y-2">
            {alertas.map((a, i) => (
              <div key={i} className="card flex items-center justify-between border-l-4 border-l-damm-red p-3">
                <div>
                  <p className="font-semibold text-damm-ink">{a.nombre}</p>
                  <p className="text-xs text-gray-400 capitalize">{formatFecha(a.fecha)}</p>
                </div>
                <Badge color="red">{ETIQUETAS_METRICA[a.metrica] ?? a.metrica}: {a.valor}</Badge>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="⏳ Encuestas pendientes"
        action={<Link to="/asistencia" className="text-xs font-semibold text-damm-red">Ver equipo →</Link>}
      >
        {totalPend === 0 ? (
          <EmptyState>El equipo lo tiene todo al día. 🎉</EmptyState>
        ) : (
          <div className="card divide-y divide-gray-100">
            {conPendientes.map((r) => (
              <Link key={r.profile_id} to={`/jugador/${r.profile_id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                <span className="text-sm font-medium text-damm-ink">{r.nombre}</span>
                <span className="flex gap-1">
                  {r.wellness_pend > 0 && <Badge color="blue">🌙 {r.wellness_pend}</Badge>}
                  {r.rpe_pend > 0 && <Badge color="gold">🔥 {r.rpe_pend}</Badge>}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title="💪 Carga por posición" action={<span className="text-xs text-gray-400">últimos {DIAS_CARGA} días</span>}>
        {Object.keys(porPos).length === 0 ? (
          <EmptyState>Aún no hay datos suficientes.</EmptyState>
        ) : (
          <div className="card divide-y divide-gray-100">
            {Object.entries(porPos).sort((a, b) => media(b[1].rpe) - media(a[1].rpe)).map(([pos, d]) => (
              <div key={pos} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm font-medium text-damm-ink">{pos}</span>
                <span className="flex gap-2 text-xs">
                  <Badge color={media(d.rpe) >= 8 ? 'red' : 'gray'}>RPE musc. {media(d.rpe).toFixed(1)}</Badge>
                  <Badge color="gray">Fatiga {media(d.fatiga).toFixed(1)}</Badge>
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function aplanar(rows: any[] | null): Resp[] {
  if (!rows) return []
  return rows.map((r) => {
    const { eventos, ...rest } = r
    return { ...rest, fecha: eventos?.fecha ?? '' } as Resp
  })
}
function diasAtras(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
function media(arr: number[]): number {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}
