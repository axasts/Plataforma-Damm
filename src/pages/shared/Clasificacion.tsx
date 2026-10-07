import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { FilaClasificacion, PeriodoClasificacion } from '../../lib/types'
import { Spinner, EmptyState, PageHeader, Modal } from '../../components/ui'
import { hoyISO } from '../../lib/utils'

// Dos classificacions:
//   · 'actual'    → la que es reseteja quan l'entrenador decideix (amb períodes anteriors guardats).
//   · 'historica' → mai es reseteja: suma tots els punts de sempre.
type Modo = 'actual' | 'historica'

function fechaCorta(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function rangoPeriodo(p: PeriodoClasificacion) {
  const desde = p.fecha_inicio <= '2000-01-01' ? 'Desde el principio' : `Desde el ${fechaCorta(p.fecha_inicio)}`
  return p.fecha_fin ? `${desde} hasta el ${fechaCorta(p.fecha_fin)}` : desde
}

export default function Clasificacion() {
  const { esEntrenador } = useAuth()
  const [modo, setModo] = useState<Modo>('actual')
  // null = cargando; [] = la migración aún no está aplicada (sin períodos).
  const [periodos, setPeriodos] = useState<PeriodoClasificacion[] | null>(null)
  const [periodoId, setPeriodoId] = useState<string | null>(null)
  const [filas, setFilas] = useState<FilaClasificacion[] | null>(null)
  const [abrirNueva, setAbrirNueva] = useState(false)

  async function cargarPeriodos() {
    const { data, error } = await supabase.rpc('get_clasificaciones')
    const ps = error ? [] : ((data as PeriodoClasificacion[]) ?? [])
    setPeriodos(ps)
    setPeriodoId(ps.find((p) => p.activa)?.id ?? null)
  }

  useEffect(() => {
    cargarPeriodos()
  }, [])

  useEffect(() => {
    if (periodos === null) return
    setFilas(null)
    // Sin períodos (BD sin migrar) se llama sin parámetros: ranking de siempre.
    const args =
      periodos.length === 0 ? undefined : modo === 'historica' ? { p_historico: true } : { p_clasificacion: periodoId }
    supabase.rpc('get_clasificacion', args).then(({ data }) => setFilas((data as FilaClasificacion[]) ?? []))
  }, [modo, periodoId, periodos])

  const periodo = periodos?.find((p) => p.id === periodoId) ?? null
  const hayPeriodos = (periodos?.length ?? 0) > 0

  async function deshacer() {
    if (!periodo) return
    if (!confirm(`¿Deshacer "${periodo.nombre}"? Sus puntos vuelven a la clasificación anterior. No se borra ningún punto.`)) return
    const { error } = await supabase.rpc('eliminar_clasificacion', { p_id: periodo.id })
    if (error) return alert(error.message)
    cargarPeriodos()
  }

  return (
    <div>
      <PageHeader
        eyebrow="Ranking del equipo"
        title="Clasificación"
        subtitle="Toca un jugador para ver su desglose de puntos."
        action={
          esEntrenador && hayPeriodos ? (
            <button className="btn-gold" onClick={() => setAbrirNueva(true)}>Nueva clasificación</button>
          ) : undefined
        }
      />

      {hayPeriodos && (
        <div className="mb-6">
          {/* Selector actual / histórica */}
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-damm-line bg-white/[0.02] p-1">
            {(['actual', 'historica'] as Modo[]).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={
                  'rounded-lg py-2 text-sm font-semibold transition ' +
                  (modo === m ? 'bg-damm-red text-white' : 'text-damm-muted hover:text-damm-ink')
                }
              >
                {m === 'actual' ? 'Actual' : 'Histórica'}
              </button>
            ))}
          </div>

          {modo === 'actual' && periodo && (
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-bold text-damm-ink">
                  {periodo.nombre}
                  {periodo.activa && <span className="ml-2 align-middle eyebrow text-damm-gold">En curso</span>}
                </p>
                <p className="text-xs text-damm-faint">{rangoPeriodo(periodo)}</p>
              </div>
              {periodos!.length > 1 && (
                <select
                  className="input w-auto max-w-[60%] py-2"
                  value={periodoId ?? ''}
                  onChange={(e) => setPeriodoId(e.target.value)}
                >
                  {periodos!.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}{p.activa ? ' (actual)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          {modo === 'historica' && (
            <p className="mt-4 text-xs text-damm-faint">Todos los puntos desde el principio. Esta clasificación no se resetea nunca.</p>
          )}
        </div>
      )}

      {!filas ? (
        <Spinner />
      ) : filas.length === 0 ? (
        <EmptyState>Todavía no hay puntos registrados.</EmptyState>
      ) : (
        <Tabla filas={filas} />
      )}

      {esEntrenador && modo === 'actual' && periodo?.activa && periodos!.length > 1 && (
        <button onClick={deshacer} className="mt-8 text-xs text-damm-faint underline-offset-2 transition hover:text-damm-red hover:underline">
          Deshacer esta clasificación
        </button>
      )}

      {abrirNueva && periodos && (
        <NuevaClasificacionModal
          actual={periodos.find((p) => p.activa) ?? null}
          onClose={() => setAbrirNueva(false)}
          onCreada={() => {
            setAbrirNueva(false)
            setModo('actual')
            cargarPeriodos()
          }}
        />
      )}
    </div>
  )
}

function Tabla({ filas }: { filas: FilaClasificacion[] }) {
  const lider = filas[0]
  const resto = filas.slice(1)
  return (
    <>
      {/* Líder destacado */}
      <Link to={`/jugador/${lider.id}`} className="group block">
        <div className="relative overflow-hidden rounded-2xl border border-damm-line bg-gradient-to-br from-white/[0.06] to-transparent p-5">
          <span className="absolute right-4 top-4 eyebrow text-damm-gold">Líder</span>
          <div className="flex items-end gap-4">
            <span className="font-display text-6xl font-extrabold leading-none text-damm-red">1</span>
            <div className="flex-1 pb-1">
              <p className="font-display text-2xl font-bold leading-tight tracking-tight text-damm-ink">{lider.nombre}</p>
              <p className="mt-1 text-sm tabular-nums">
                <span className="text-damm-good">+{lider.sumados}</span>
                <span className="mx-1.5 text-damm-faint">·</span>
                <span className="text-damm-red">{lider.restados}</span>
              </p>
            </div>
            <div className="pb-1 text-right">
              <p className="font-display text-4xl font-extrabold tabular-nums leading-none text-damm-ink">{lider.total}</p>
              <p className="mt-1 eyebrow text-damm-faint">Puntos</p>
            </div>
          </div>
        </div>
      </Link>

      {/* Resto de la tabla */}
      {resto.length > 0 && (
        <div className="mt-8">
          <div className="grid grid-cols-[28px_1fr_auto_64px] items-center gap-3 border-b border-damm-line2 pb-2 eyebrow text-damm-faint">
            <span>#</span>
            <span>Jugador</span>
            <span className="text-right">+ / −</span>
            <span className="text-right">Total</span>
          </div>
          {resto.map((f, i) => (
            <Link key={f.id} to={`/jugador/${f.id}`} className="grid grid-cols-[28px_1fr_auto_64px] items-center gap-3 border-b border-damm-line py-3 transition hover:bg-white/[0.03]">
              <span className="font-display text-base font-bold tabular-nums text-damm-faint">{i + 2}</span>
              <span className="truncate text-sm font-medium text-damm-ink">{f.nombre}</span>
              <span className="text-right text-xs tabular-nums text-damm-muted">
                <span className="text-damm-good">+{f.sumados}</span> <span className="text-damm-red">{f.restados}</span>
              </span>
              <span className="text-right font-display text-lg font-bold tabular-nums text-damm-ink">{f.total}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

function NuevaClasificacionModal({ actual, onClose, onCreada }: {
  actual: PeriodoClasificacion | null
  onClose: () => void
  onCreada: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function crear() {
    setGuardando(true)
    setError(null)
    const { error } = await supabase.rpc('nueva_clasificacion', { p_nombre: nombre, p_fecha: fecha })
    setGuardando(false)
    if (error) return setError(error.message)
    onCreada()
  }

  return (
    <Modal open onClose={onClose} title="Nueva clasificación">
      <p className="mb-5 text-sm text-damm-muted">
        La clasificación <b className="text-damm-ink">Actual</b> vuelve a empezar desde 0 a partir de la fecha indicada.
        {actual && <> «{actual.nombre}» queda guardada y se puede consultar.</>} La <b className="text-damm-ink">Histórica</b> no
        cambia y no se borra ningún punto.
      </p>
      <label className="label">Nombre</label>
      <input
        className="input mb-4"
        placeholder="Ej: 2ª vuelta, Diciembre…"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        autoFocus
      />
      <label className="label">Empieza el</label>
      <input className="input mb-1" type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} />
      <p className="mb-5 text-xs text-damm-faint">Los puntos de eventos de ese día en adelante cuentan en la nueva.</p>
      {error && <p className="mb-4 text-sm text-damm-red">{error}</p>}
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" disabled={guardando || !nombre.trim() || !fecha} onClick={crear}>
          {guardando ? 'Creando…' : 'Empezar de 0'}
        </button>
      </div>
    </Modal>
  )
}
