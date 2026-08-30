import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Spinner, EmptyState, Section, PageHeader } from '../../components/ui'
import { formatFecha } from '../../lib/utils'
import StatsCharts from '../../components/StatsCharts'

interface Mov {
  fecha: string
  puntos: number
  motivo: string | null
  created_at: string
}

export default function MisEstadisticas() {
  const { perfil, usaPuntos } = useAuth()
  const [movs, setMovs] = useState<Mov[] | null>(null)

  useEffect(() => {
    if (!perfil) return
    if (usaPuntos) {
      supabase.rpc('get_desglose_jugador', { p_id: perfil.id }).then(({ data }) => setMovs((data as Mov[]) ?? []))
    } else {
      setMovs([])
    }
  }, [perfil, usaPuntos])

  if (!perfil) return null
  if (!movs) return <Spinner />

  const sumados = movs.filter((m) => m.puntos > 0).reduce((a, m) => a + m.puntos, 0)
  const restados = movs.filter((m) => m.puntos < 0).reduce((a, m) => a + m.puntos, 0)
  const total = sumados + restados

  return (
    <div>
      <PageHeader eyebrow="Privado" title="Mis datos" subtitle="Solo tú puedes ver esto." />

      {usaPuntos && (
        <>
          {/* Resumen de puntos */}
          <div className="mb-8 grid grid-cols-3 divide-x divide-damm-line border-y border-damm-line">
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

          {/* Detalle: cada movimiento con su motivo (por qué te han sumado/restado) */}
          <Section title="Mis puntos">
            {movs.length === 0 ? (
              <EmptyState>Aún no tienes movimientos de puntos.</EmptyState>
            ) : (
              <div>
                {movs.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-damm-line py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-damm-ink">{m.motivo || 'Ajuste manual'}</p>
                      <p className="mt-0.5 text-xs capitalize text-damm-faint">{formatFecha(m.fecha)}</p>
                    </div>
                    <span className={'font-display text-base font-bold tabular-nums ' + (m.puntos >= 0 ? 'text-damm-good' : 'text-damm-red')}>
                      {m.puntos > 0 ? '+' : ''}{m.puntos}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      {/* Evolución de wellness y RPE */}
      <StatsCharts profileId={perfil.id} />
    </div>
  )
}
