import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { FilaClasificacion } from '../../lib/types'
import { Spinner, EmptyState } from '../../components/ui'

export default function Clasificacion() {
  const [filas, setFilas] = useState<FilaClasificacion[] | null>(null)

  useEffect(() => {
    supabase.rpc('get_clasificacion').then(({ data }) => setFilas((data as FilaClasificacion[]) ?? []))
  }, [])

  if (!filas) return <Spinner />

  return (
    <div>
      <h1 className="mb-1 text-lg font-black text-damm-ink">Clasificación 🏆</h1>
      <p className="mb-5 text-sm text-gray-500">Ranking del equipo. Toca un jugador para ver el detalle.</p>

      {filas.length === 0 ? (
        <EmptyState>Todavía no hay puntos registrados.</EmptyState>
      ) : (
        <div className="card divide-y divide-gray-100">
          {filas.map((f, i) => (
            <Link key={f.id} to={`/jugador/${f.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
              <span className={'flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ' + medalla(i)}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-damm-ink">{f.nombre}</p>
                <p className="text-xs text-gray-400">
                  <span className="text-green-600">+{f.sumados}</span>{' '}
                  <span className="text-red-500">{f.restados}</span>
                </p>
              </div>
              <span className="text-lg font-black text-damm-red">{f.total}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function medalla(i: number): string {
  if (i === 0) return 'bg-damm-gold text-damm-ink'
  if (i === 1) return 'bg-gray-200 text-gray-700'
  if (i === 2) return 'bg-amber-200 text-amber-800'
  return 'bg-gray-100 text-gray-400'
}
