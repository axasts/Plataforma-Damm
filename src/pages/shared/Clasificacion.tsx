import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { FilaClasificacion } from '../../lib/types'
import { Spinner, EmptyState, PageHeader } from '../../components/ui'

export default function Clasificacion() {
  const [filas, setFilas] = useState<FilaClasificacion[] | null>(null)

  useEffect(() => {
    supabase.rpc('get_clasificacion').then(({ data }) => setFilas((data as FilaClasificacion[]) ?? []))
  }, [])

  if (!filas) return <Spinner />

  const lider = filas[0]
  const resto = filas.slice(1)

  return (
    <div>
      <PageHeader eyebrow="Ranking del equipo" title="Clasificación" subtitle="Toca un jugador para ver su desglose de puntos." />

      {filas.length === 0 ? (
        <EmptyState>Todavía no hay puntos registrados.</EmptyState>
      ) : (
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
      )}
    </div>
  )
}
