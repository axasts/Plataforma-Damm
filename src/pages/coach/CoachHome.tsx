import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { ReglaAlerta } from '../../lib/types'
import { Spinner, PageHeader } from '../../components/ui'
import { TeamStatsCharts } from '../../components/StatsCharts'
import { ETIQUETAS_METRICA, formatFecha } from '../../lib/utils'

interface Jug { id: string; nombre: string; posicion: string | null }
interface Resp { profile_id: string; fecha: string; [k: string]: any }
interface Resumen { profile_id: string; nombre: string; wellness_pend: number; rpe_pend: number }
interface Alerta { nombre: string; metrica: string; valor: number; fecha: string }
interface Lesion { profile_id: string; fecha_inicio: string; fecha_fin: string }
interface PuntoSemana { profile_id: string; puntos: number; motivo: string | null; fecha: string }

const DIAS_ALERTA = 4
const DIAS_CARGA = 7
const DIAS_BUSQUEDA = 14
const METRICAS_BUSCADOR = ['sueno', 'fatiga', 'dolor_muscular', 'estres', 'animo', 'rpe_muscular', 'rpe_respiratorio']
const METRICAS_CARGA = ['rpe_muscular', 'rpe_respiratorio', 'fatiga']
const RPE_SET = new Set(['rpe_muscular', 'rpe_respiratorio'])

export default function CoachHome() {
  const { perfil } = useAuth()
  const [jug, setJug] = useState<Record<string, Jug>>({})
  const [wellness, setWellness] = useState<Resp[]>([])
  const [rpe, setRpe] = useState<Resp[]>([])
  const [reglas, setReglas] = useState<ReglaAlerta[]>([])
  const [resumen, setResumen] = useState<Resumen[]>([])
  const [lesiones, setLesiones] = useState<Lesion[]>([])
  const [puntosSemana, setPuntosSemana] = useState<PuntoSemana[]>([])
  const [cargando, setCargando] = useState(true)
  const [metricaCarga, setMetricaCarga] = useState('rpe_muscular')

  async function cargar() {
    const [jRes, wRes, rRes, reRes, pRes, lRes, psRes] = await Promise.all([
      supabase.from('perfiles').select('id,nombre,posicion').eq('rol', 'jugador'),
      supabase.from('wellness').select('profile_id,sueno,fatiga,dolor_muscular,estres,animo,eventos(fecha)').order('created_at', { ascending: false }).limit(150),
      supabase.from('rpe').select('profile_id,rpe_muscular,rpe_respiratorio,eventos(fecha)').order('created_at', { ascending: false }).limit(150),
      supabase.from('reglas_alerta').select('*').eq('activa', true),
      supabase.rpc('get_resumen_pendientes'),
      supabase.from('lesiones').select('profile_id,fecha_inicio,fecha_fin'),
      supabase.from('puntos').select('profile_id,puntos,motivo,fecha').gte('fecha', inicioSemana()).lte('fecha', finSemana()),
    ])
    const mapa: Record<string, Jug> = {}
    ;((jRes.data as Jug[]) ?? []).forEach((j) => (mapa[j.id] = j))
    setJug(mapa)
    setWellness(aplanar(wRes.data))
    setRpe(aplanar(rRes.data))
    setReglas((reRes.data as ReglaAlerta[]) ?? [])
    setResumen((pRes.data as Resumen[]) ?? [])
    setLesiones((lRes.data as Lesion[]) ?? [])
    setPuntosSemana((psRes.data as PuntoSemana[]) ?? [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  if (cargando) return <Spinner label="Cargando panel…" />

  // ---- Alertas ----
  const limiteAlerta = diasAtras(DIAS_ALERTA)
  const alertas: Alerta[] = []
  for (const r of [...wellness, ...rpe]) {
    if (r.fecha < limiteAlerta) continue
    for (const rg of reglas) {
      const v = r[rg.metrica]
      if (v === undefined || v === null) continue
      const disp = rg.operador === '>=' ? v >= rg.valor : v <= rg.valor
      if (disp) alertas.push({ nombre: jug[r.profile_id]?.nombre ?? '—', metrica: rg.metrica, valor: v, fecha: r.fecha })
    }
  }

  // ---- Pendientes ----
  const conPendientes = resumen.filter((r) => r.wellness_pend + r.rpe_pend > 0)
  const totalPend = resumen.reduce((a, r) => a + r.wellness_pend + r.rpe_pend, 0)

  // ---- Carga por posición (métrica filtrable) ----
  const limiteCarga = diasAtras(DIAS_CARGA)
  const cargaEsRpe = RPE_SET.has(metricaCarga)
  const fuenteCarga = cargaEsRpe ? rpe : wellness
  const porPos: Record<string, number[]> = {}
  for (const r of fuenteCarga) {
    if (r.fecha < limiteCarga) continue
    const v = r[metricaCarga]
    if (v == null) continue
    const pos = jug[r.profile_id]?.posicion ?? 'Sin posición'
    ;(porPos[pos] ??= []).push(v)
  }
  const cargaOrden = Object.entries(porPos).map(([pos, arr]) => ({ pos, media: media(arr) })).sort((a, b) => b.media - a.media)

  // ---- Métricas cabecera ----
  const hoy = hoyISO()
  const bajas = lesiones.filter((l) => l.fecha_inicio <= hoy && hoy <= l.fecha_fin).length
  const rpeReciente = rpe.filter((r) => r.fecha >= limiteCarga).map((r) => r.rpe_muscular)
  const rpeMedio = rpeReciente.length ? media(rpeReciente) : null
  const nJug = Object.keys(jug).length

  return (
    <div>
      <PageHeader eyebrow="Estado del equipo" title="Panel" />

      {/* Banda de cifras */}
      <div className="grid grid-cols-2 border-y border-damm-line sm:grid-cols-4">
        <Stat label="Pendientes" value={totalPend} foot={`de ${nJug} jugadores`} tone={totalPend > 0 ? 'warn' : 'good'} />
        <Stat label="Alertas" value={alertas.length} foot={`últimos ${DIAS_ALERTA} días`} tone={alertas.length > 0 ? 'bad' : 'good'} divide />
        <Stat label="RPE medio" value={rpeMedio === null ? '—' : rpeMedio.toFixed(1)} foot="carga muscular" tone={rpeMedio !== null && rpeMedio >= 8 ? 'bad' : 'mut'} divide smBreak />
        <Stat label="Bajas" value={bajas} foot="lesionados" tone={bajas > 0 ? 'warn' : 'good'} divide />
      </div>

      {/* 1) Wellness y RPE del equipo (lo primero) */}
      <div className="mt-10">
        <TeamStatsCharts />
      </div>

      {/* 2) Buscar por valor */}
      <BuscadorValores jug={jug} wellness={wellness} rpe={rpe} />

      {/* 3) Alertas */}
      <div className="mt-10">
        <SecHead title="Alertas recientes" hint={`últimos ${DIAS_ALERTA} días`} />
        {alertas.length === 0 ? (
          <p className="py-2 text-sm text-damm-muted">Sin picos que superen tus umbrales.</p>
        ) : (
          <div>
            {alertas.map((a, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-damm-line py-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-damm-red" />
                <span className="flex-1 text-sm font-medium text-damm-ink">{a.nombre}</span>
                <span className="text-sm text-damm-muted">{ETIQUETAS_METRICA[a.metrica] ?? a.metrica}</span>
                <span className="font-display text-lg font-bold tabular-nums text-damm-red">{a.valor}</span>
                <span className="w-16 text-right text-xs capitalize text-damm-faint">{formatFecha(a.fecha)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4) Carga por posición (filtrable) + Pendientes */}
      <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2">
        <div>
          <SecHead title="Carga por demarcación" hint={`${DIAS_CARGA} días`} />
          <div className="mb-3 flex flex-wrap gap-2">
            {METRICAS_CARGA.map((k) => (
              <button
                key={k}
                onClick={() => setMetricaCarga(k)}
                className={'chip cursor-pointer border transition ' + (metricaCarga === k ? 'border-damm-red bg-damm-red/15 text-damm-ink' : 'border-damm-line text-damm-faint hover:text-damm-muted')}
              >
                {ETIQUETAS_METRICA[k] ?? k}
              </button>
            ))}
          </div>
          {cargaOrden.length === 0 ? (
            <p className="py-2 text-sm text-damm-muted">Aún no hay datos suficientes.</p>
          ) : (
            <div className="space-y-3 pt-1">
              {cargaOrden.map(({ pos, media: m }) => {
                const alto = cargaEsRpe && m >= 8
                return (
                  <div key={pos}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-damm-muted">{pos}</span>
                      <span className={'font-display font-bold tabular-nums ' + (alto ? 'text-damm-red' : 'text-damm-ink')}>{m.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className={'h-full rounded-full ' + (alto ? 'bg-damm-red' : 'bg-damm-gold')} style={{ width: `${(m / 10) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <SecHead title="Encuestas pendientes" link={<Link to="/plantilla" className="text-xs font-semibold text-damm-red hover:text-damm-red-dark">Ver equipo →</Link>} />
          {totalPend === 0 ? (
            <p className="py-2 text-sm text-damm-muted">El equipo lo tiene todo al día.</p>
          ) : (
            <div>
              {conPendientes.map((r) => (
                <Link key={r.profile_id} to={`/jugador/${r.profile_id}`} className="flex items-center justify-between border-b border-damm-line py-2.5 transition hover:text-damm-ink">
                  <span className="text-sm font-medium text-damm-ink">{r.nombre}</span>
                  <span className="flex items-center gap-3 text-xs text-damm-muted">
                    {r.wellness_pend > 0 && <span>Wellness <b className="text-damm-ink">{r.wellness_pend}</b></span>}
                    {r.rpe_pend > 0 && <span>RPE <b className="text-damm-ink">{r.rpe_pend}</b></span>}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5) Media semanal para lesionados */}
      <MediaSemanal jugadores={Object.values(jug)} lesiones={lesiones} puntosSemana={puntosSemana} coachId={perfil?.id ?? null} onAplicado={cargar} />
    </div>
  )
}

function MediaSemanal({ jugadores, lesiones, puntosSemana, coachId, onAplicado }: {
  jugadores: Jug[]; lesiones: Lesion[]; puntosSemana: PuntoSemana[]; coachId: string | null; onAplicado: () => void
}) {
  const [aplicando, setAplicando] = useState(false)
  const hoy = hoyISO()
  const lesionados = jugadores.filter((j) => lesiones.some((l) => l.profile_id === j.id && l.fecha_inicio <= hoy && hoy <= l.fecha_fin))
  const lesSet = new Set(lesionados.map((j) => j.id))

  // Suma de puntos POSITIVOS (ejercicios) por jugador esta semana. Las sanciones (negativos) NO cuentan.
  const sumaPos: Record<string, number> = {}
  for (const p of puntosSemana) if (p.puntos > 0) sumaPos[p.profile_id] = (sumaPos[p.profile_id] ?? 0) + p.puntos

  const sanos = jugadores.filter((j) => !lesSet.has(j.id))
  const totalesSanos = sanos.map((j) => sumaPos[j.id] ?? 0)
  const media = totalesSanos.length ? Math.round(totalesSanos.reduce((a, b) => a + b, 0) / totalesSanos.length) : 0

  const yaAplicada = (pid: string) => puntosSemana.some((p) => p.profile_id === pid && p.motivo === 'Media semanal')
  const pendientes = lesionados.filter((j) => !yaAplicada(j.id))

  async function aplicar() {
    if (media <= 0 || pendientes.length === 0) return
    setAplicando(true)
    const filas = pendientes.map((j) => ({ profile_id: j.id, puntos: media, motivo: 'Media semanal', fecha: hoy, registrado_por: coachId, evento_id: null }))
    await supabase.from('puntos').insert(filas)
    setAplicando(false)
    onAplicado()
  }

  return (
    <div className="mt-10">
      <SecHead title="Media semanal · lesionados" hint="solo puntos de ejercicios" />
      {lesionados.length === 0 ? (
        <p className="py-2 text-sm text-damm-muted">Ningún jugador lesionado esta semana.</p>
      ) : (
        <>
          <div className="mb-4 flex items-baseline gap-3">
            <span className="text-sm text-damm-muted">Media de ejercicios del equipo (esta semana):</span>
            <span className="font-display text-2xl font-bold tabular-nums text-damm-good">+{media}</span>
          </div>
          <div className="mb-4">
            {lesionados.map((j) => (
              <div key={j.id} className="flex items-center justify-between border-b border-damm-line py-2.5">
                <span className="text-sm font-medium text-damm-ink">{j.nombre}</span>
                {yaAplicada(j.id)
                  ? <span className="text-xs font-semibold text-damm-good">Aplicada ✓</span>
                  : <span className="text-xs text-damm-faint">Pendiente</span>}
              </div>
            ))}
          </div>
          <button className="btn-gold" disabled={aplicando || media <= 0 || pendientes.length === 0} onClick={aplicar}>
            {pendientes.length === 0 ? 'Ya aplicada a todos' : `Aplicar +${media} a ${pendientes.length} lesionado${pendientes.length !== 1 ? 's' : ''}`}
          </button>
          <p className="mt-2 text-xs text-damm-faint">Suma la media de puntos de ejercicios de los no lesionados. Las sanciones no cuentan en el cálculo.</p>
        </>
      )}
    </div>
  )
}

function BuscadorValores({ jug, wellness, rpe }: { jug: Record<string, Jug>; wellness: Resp[]; rpe: Resp[] }) {
  const [metrica, setMetrica] = useState('fatiga')
  const [op, setOp] = useState<'>=' | '<='>('>=')
  const [valor, setValor] = useState(8)

  const fuente = RPE_SET.has(metrica) ? rpe : wellness
  const limite = diasAtras(DIAS_BUSQUEDA)
  const porJug = new Map<string, { valor: number; fecha: string }>()
  for (const r of fuente) {
    const v = r[metrica]
    if (r.fecha < limite || v == null) continue
    const ok = op === '>=' ? v >= valor : v <= valor
    if (!ok) continue
    const prev = porJug.get(r.profile_id)
    if (!prev || (op === '>=' ? v > prev.valor : v < prev.valor)) porJug.set(r.profile_id, { valor: v, fecha: r.fecha })
  }
  const matches = [...porJug.entries()]
    .map(([pid, x]) => ({ nombre: jug[pid]?.nombre ?? '—', pos: jug[pid]?.posicion ?? null, ...x }))
    .sort((a, b) => (op === '>=' ? b.valor - a.valor : a.valor - b.valor))

  return (
    <div className="mt-10">
      <SecHead title="Buscar por valor" hint={`últimos ${DIAS_BUSQUEDA} días`} />

      <div className="mb-3 flex flex-wrap gap-2">
        {METRICAS_BUSCADOR.map((k) => (
          <button
            key={k}
            onClick={() => setMetrica(k)}
            className={'chip cursor-pointer border transition ' + (metrica === k ? 'border-damm-red bg-damm-red/15 text-damm-ink' : 'border-damm-line text-damm-faint hover:text-damm-muted')}
          >
            {ETIQUETAS_METRICA[k] ?? k}
          </button>
        ))}
      </div>

      <div className="mb-5 flex items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-damm-line bg-white/[0.03] p-1 text-sm font-semibold">
          <button className={'rounded px-3 py-1 transition ' + (op === '>=' ? 'bg-damm-red text-white' : 'text-damm-muted hover:text-damm-ink')} onClick={() => setOp('>=')}>≥</button>
          <button className={'rounded px-3 py-1 transition ' + (op === '<=' ? 'bg-damm-red text-white' : 'text-damm-muted hover:text-damm-ink')} onClick={() => setOp('<=')}>≤</button>
        </div>
        <input
          type="number" min={0} max={10} value={valor}
          onChange={(e) => setValor(Math.max(0, Math.min(10, Number(e.target.value))))}
          className="input w-20 text-center font-display text-lg font-bold"
        />
        <span className="text-sm text-damm-muted">{ETIQUETAS_METRICA[metrica]} {op} {valor}</span>
      </div>

      {matches.length === 0 ? (
        <p className="py-2 text-sm text-damm-faint">Ningún jugador cumple {ETIQUETAS_METRICA[metrica]} {op} {valor} en los últimos {DIAS_BUSQUEDA} días.</p>
      ) : (
        <div>
          <p className="mb-1 text-xs tabular-nums text-damm-faint">{matches.length} jugador{matches.length !== 1 ? 'es' : ''}</p>
          {matches.map((mt, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-damm-line py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-damm-ink">
                {mt.nombre}{mt.pos && <span className="text-damm-faint"> · {mt.pos}</span>}
              </span>
              <span className="text-xs capitalize text-damm-faint">{formatFecha(mt.fecha)}</span>
              <span className={'font-display text-base font-bold tabular-nums ' + (op === '>=' ? 'text-damm-red' : 'text-damm-gold')}>{mt.valor}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, foot, tone = 'mut', divide, smBreak }: {
  label: string; value: number | string; foot: string; tone?: 'good' | 'warn' | 'bad' | 'mut'; divide?: boolean; smBreak?: boolean
}) {
  const toneCls = { good: 'text-damm-good', warn: 'text-damm-gold', bad: 'text-damm-red', mut: 'text-damm-ink' }[tone]
  return (
    <div className={
      'px-1 py-4 sm:px-4 ' +
      (divide ? 'border-l border-damm-line ' : '') +
      (smBreak ? 'border-t border-damm-line sm:border-t-0 ' : '')
    }>
      <p className="eyebrow text-damm-faint">{label}</p>
      <p className={'mt-1.5 font-display text-3xl font-bold tabular-nums ' + toneCls}>{value}</p>
      <p className="mt-0.5 text-xs text-damm-faint">{foot}</p>
    </div>
  )
}

function SecHead({ title, hint, link }: { title: string; hint?: string; link?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between border-b border-damm-line2 pb-2">
      <h2 className="eyebrow text-damm-muted">{title}</h2>
      {hint && <span className="text-xs text-damm-faint">{hint}</span>}
      {link}
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
function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}
function inicioSemana(): string {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // lunes
  return d.toISOString().slice(0, 10)
}
function finSemana(): string {
  const d = new Date()
  d.setDate(d.getDate() + (6 - ((d.getDay() + 6) % 7))) // domingo
  return d.toISOString().slice(0, 10)
}
function media(arr: number[]): number {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}
