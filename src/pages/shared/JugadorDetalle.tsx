import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Spinner, EmptyState, Section, Badge } from '../../components/ui'
import { formatFecha } from '../../lib/utils'
import StatsCharts from '../../components/StatsCharts'

interface Mov {
  fecha: string
  puntos: number
  motivo: string | null
  created_at: string
}

export default function JugadorDetalle() {
  const { id } = useParams()
  const { esEntrenador } = useAuth()
  const nav = useNavigate()
  const [nombre, setNombre] = useState('')
  const [movs, setMovs] = useState<Mov[] | null>(null)

  useEffect(() => {
    if (!id) return
    supabase.rpc('get_jugadores_publicos').then(({ data }) => {
      const j = (data as any[])?.find((x) => x.id === id)
      setNombre(j?.nombre ?? 'Jugador')
    })
    supabase.rpc('get_desglose_jugador', { p_id: id }).then(({ data }) => setMovs((data as Mov[]) ?? []))
  }, [id])

  if (!movs || !id) return <Spinner />

  const sumados = movs.filter((m) => m.puntos > 0).reduce((a, m) => a + m.puntos, 0)
  const restados = movs.filter((m) => m.puntos < 0).reduce((a, m) => a + m.puntos, 0)
  const total = sumados + restados

  return (
    <div>
      <button onClick={() => nav(-1)} className="mb-3 text-sm text-gray-400">← Volver</button>
      <h1 className="text-lg font-black text-damm-ink">{nombre}</h1>

      <div className="my-4 grid grid-cols-3 gap-2 text-center">
        <div className="card p-3">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-xl font-black text-damm-red">{total}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-400">Sumados</p>
          <p className="text-xl font-black text-green-600">+{sumados}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-400">Restados</p>
          <p className="text-xl font-black text-red-500">{restados}</p>
        </div>
      </div>

      <Section title="Movimientos de puntos">
        {movs.length === 0 ? (
          <EmptyState>Sin movimientos todavía.</EmptyState>
        ) : (
          <div className="card divide-y divide-gray-100">
            {movs.map((m, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-damm-ink">{m.motivo || 'Ajuste manual'}</p>
                  <p className="text-xs capitalize text-gray-400">{formatFecha(m.fecha)}</p>
                </div>
                <Badge color={m.puntos >= 0 ? 'green' : 'red'}>
                  {m.puntos > 0 ? '+' : ''}{m.puntos}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Section>

      {esEntrenador && (
        <div className="mt-6">
          <StatsCharts profileId={id} />
        </div>
      )}
    </div>
  )
}
