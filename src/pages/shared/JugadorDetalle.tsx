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
      <button onClick={() => nav(-1)} className="mb-3 text-sm text-damm-faint transition hover:text-damm-muted">← Volver</button>
      <h1 className="font-display text-2xl font-bold tracking-tight">{nombre}</h1>

      <div className="my-5 grid grid-cols-3 divide-x divide-damm-line border-y border-damm-line">
        <div className="px-3 py-4 text-center">
          <p className="eyebrow text-damm-faint">Total</p>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-damm-ink">{total}</p>
        </div>
        <div className="px-3 py-4 text-center">
          <p className="eyebrow text-damm-faint">Sumados</p>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-damm-good">+{sumados}</p>
        </div>
        <div className="px-3 py-4 text-center">
          <p className="eyebrow text-damm-faint">Restados</p>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-damm-red">{restados}</p>
        </div>
      </div>

      <Section title="Movimientos de puntos">
        {movs.length === 0 ? (
          <EmptyState>Sin movimientos todavía.</EmptyState>
        ) : (
          <div className="card divide-y divide-white/5">
            {movs.map((m, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-damm-ink">{m.motivo || 'Ajuste manual'}</p>
                  <p className="text-xs capitalize text-damm-faint">{formatFecha(m.fecha)}</p>
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
