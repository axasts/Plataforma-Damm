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

// ---- Finestres de resposta -------------------------------------------------
// Cada enquesta té tres estats segons quan es respon:
//   'a_tiempo' → dins del termini (compta com a bona)
//   'tarde'    → passat el termini, però encara es pot respondre
//   'cerrado'  → passat el marge màxim: ja NO es pot respondre
export type EstadoPlazo = 'a_tiempo' | 'tarde' | 'cerrado'

// Wellness (enquesta del matí):
//   · Entrenament: a temps fins les 18:00 del mateix dia.
//   · Partit: a temps fins 1 h 30 min abans de l'hora del partit.
//   · En tots dos casos es pot respondre tard fins que acaba el dia; després es tanca.
export function wellnessPlazo(evento: Evento, ahora = new Date()): EstadoPlazo {
  const finDia = new Date(evento.fecha + 'T23:59:59')
  let limiteOk: Date
  if (evento.tipo === 'partido') {
    if (evento.hora) {
      // 1 h 30 min abans de l'hora del partit.
      limiteOk = new Date(evento.fecha + 'T' + evento.hora)
      limiteOk.setMinutes(limiteOk.getMinutes() - 90)
    } else {
      // Partit sense hora definida: no es pot calcular "1h30 abans";
      // el considerem a temps mentre sigui el mateix dia.
      limiteOk = finDia
    }
  } else {
    limiteOk = new Date(evento.fecha + 'T18:00:00')
  }
  if (ahora <= limiteOk) return 'a_tiempo'
  if (ahora <= finDia) return 'tarde'
  return 'cerrado'
}

// RPE (igual per a entrenament i partit):
//   · A temps fins les 23:59 del mateix dia.
//   · Es pot respondre tard fins al final del dia següent; després es tanca.
export function rpePlazo(evento: Evento, ahora = new Date()): EstadoPlazo {
  const finMismoDia = new Date(evento.fecha + 'T23:59:59')
  const finDiaSiguiente = new Date(evento.fecha + 'T23:59:59')
  finDiaSiguiente.setDate(finDiaSiguiente.getDate() + 1)
  if (ahora <= finMismoDia) return 'a_tiempo'
  if (ahora <= finDiaSiguiente) return 'tarde'
  return 'cerrado'
}

// Compatibilitat: booleà "a temps" (per desar `a_tiempo` i per al panell d'entrenador).
export function wellnessATiempo(evento: Evento, ahora = new Date()): boolean {
  return wellnessPlazo(evento, ahora) === 'a_tiempo'
}
export function rpeATiempo(evento: Evento, ahora = new Date()): boolean {
  return rpePlazo(evento, ahora) === 'a_tiempo'
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
