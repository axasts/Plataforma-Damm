import { Evento } from './types'

// ---- Dates -----------------------------------------------------------------

export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatFecha(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

export function formatFechaLarga(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

// ---- Finestres "a temps" ---------------------------------------------------
// Wellness: dt/dc abans de 19:30, dv abans de 18:00; partit abans que acabi el dia.
export function wellnessATiempo(evento: Evento, ahora = new Date()): boolean {
  const fecha = new Date(evento.fecha + 'T00:00:00')
  const finDia = new Date(evento.fecha + 'T23:59:59')

  if (evento.tipo === 'partido') {
    return ahora <= finDia
  }
  // Entrenament: si es respon abans del dia, sempre a temps.
  if (ahora < fecha) return true
  // Mateix dia: segons el dia de la setmana.
  const mismoDia = ahora.toISOString().slice(0, 10) === evento.fecha
  if (!mismoDia) return false // dia posterior → tard
  const dow = fecha.getDay() // 0=diu ... 5=div
  const [hLim, mLim] = dow === 5 ? [18, 0] : [19, 30]
  const limite = new Date(fecha)
  limite.setHours(hLim, mLim, 0, 0)
  return ahora <= limite
}

// RPE: a temps si es respon abans de les 02:00 del dia següent.
export function rpeATiempo(evento: Evento, ahora = new Date()): boolean {
  const limite = new Date(evento.fecha + 'T00:00:00')
  limite.setDate(limite.getDate() + 1)
  limite.setHours(2, 0, 0, 0)
  return ahora <= limite
}

// ---- Etiquetes de mètriques ------------------------------------------------

export interface MetricaInfo {
  key: string
  label: string
  min: string
  max: string
}

export const METRICAS_WELLNESS: MetricaInfo[] = [
  { key: 'sueno', label: 'Calidad del sueño', min: 'poco', max: 'muy bien' },
  { key: 'fatiga', label: 'Fatiga', min: 'nada cansado', max: 'muy cansado' },
  { key: 'dolor_muscular', label: 'Dolor muscular (agujetas)', min: 'sin molestias', max: 'muchas molestias' },
  { key: 'estres', label: 'Estrés', min: 'tranquilo', max: 'muy estresado' },
  { key: 'animo', label: 'Estado de ánimo', min: 'bajo ánimo', max: 'buen humor' },
]

export const METRICAS_RPE: MetricaInfo[] = [
  { key: 'rpe_muscular', label: 'RPE muscular', min: 'en reposo', max: 'muy fatigado' },
  { key: 'rpe_respiratorio', label: 'RPE respiratorio (cardio)', min: 'en reposo', max: 'muy fatigado' },
]

export const ETIQUETAS_METRICA: Record<string, string> = {
  sueno: 'Sueño',
  fatiga: 'Fatiga',
  dolor_muscular: 'Dolor muscular',
  estres: 'Estrés',
  animo: 'Ánimo',
  rpe_muscular: 'RPE muscular',
  rpe_respiratorio: 'RPE respiratorio',
}

export function nombreEvento(e: { tipo: string; titulo: string | null; rival?: string | null }): string {
  if (e.tipo === 'partido') return e.rival ? `Partido vs ${e.rival}` : e.titulo || 'Partido'
  return e.titulo || 'Entrenamiento'
}

// ---- Posiciones -----------------------------------------------------------
// Sugerencias para el campo posición (mantiene la nomenclatura consistente).
// El orden de esta lista es el orden "por líneas" del equipo.
export const POSICIONES: string[] = [
  'Portero',
  'Central derecho', 'Central izquierdo',
  'Lateral derecho', 'Lateral izquierdo',
  'Pivote',
  'Interior derecho', 'Interior izquierdo',
  'Punta',
  'Extremo derecho', 'Extremo izquierdo',
]

// Clave de orden de una posición (texto libre) para ordenar la plantilla:
// porteros → centrales → laterales → pivote → interiores → punta → extremos,
// y dentro de cada línea siempre primero el derecho y luego el izquierdo.
export function ordenPosicion(posicion: string | null): number {
  const p = (posicion ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
  if (!p.trim()) return 9999 // "Sin posición" al final

  const lado = /(derech|dret)/.test(p) ? 0 : /(izquierd|esquerr)/.test(p) ? 1 : 0

  let base: number
  if (/(porter|portar|arquer)/.test(p)) base = 0
  else if (/(central|centre)/.test(p)) base = 10
  else if (/(lateral|carriler)/.test(p)) base = 20
  else if (/pivot/.test(p)) base = 30
  else if (/interior/.test(p)) base = 40
  else if (/(punta|delanter|davanter|ariete|9)/.test(p)) base = 50
  else if (/(extrem|banda|winger)/.test(p)) base = 60
  else base = 900 // desconocida, antes de "sin posición"

  return base + lado
}
