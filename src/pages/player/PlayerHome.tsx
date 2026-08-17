import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Pendiente } from '../../lib/types'
import { Spinner, EmptyState, Section } from '../../components/ui'
import { formatFecha, nombreEvento } from '../../lib/utils'

export default function PlayerHome() {
  const { perfil } = useAuth()
  const [pend, setPend] = useState<Pendiente[] | null>(null)

  useEffect(() => {
    if (!perfil) return
    supabase
      .rpc('get_pendientes', { p_profile: perfil.id })
      .then(({ data }) => setPend((data as Pendiente[]) ?? []))
  }, [perfil])

  if (!pend) return <Spinner label="Cargando…" />

  const wellness = pend.filter((p) => p.tipo_encuesta === 'wellness')
  const rpe = pend.filter((p) => p.tipo_encuesta === 'rpe')

  return (
    <div>
      <div className="mb-7 flex items-center gap-3.5">
        <div className="relative text-damm-ink">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
            <path d="M10 20a2 2 0 0 0 4 0" />
          </svg>
          {pend.length > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-damm-red px-1 text-xs font-bold text-white">
              {pend.length}
            </span>
          )}
        </div>
        <div>
          <h1 className="font-display text-xl font-bold leading-tight tracking-tight">
            {pend.length === 0 ? '¡Todo al día!' : `Tienes ${pend.length} encuesta${pend.length > 1 ? 's' : ''} pendiente${pend.length > 1 ? 's' : ''}`}
          </h1>
          <p className="text-sm text-damm-muted">
            {pend.length === 0 ? 'No te queda nada por rellenar.' : 'Rellénalas cuando puedas.'}
          </p>
        </div>
      </div>

      {pend.length === 0 && (
        <EmptyState>Gracias por mantener tus encuestas al día.</EmptyState>
      )}

      {wellness.length > 0 && (
        <Section title="Wellness · por la mañana">
          <div className="space-y-2">
            {wellness.map((p) => (
              <TarjetaPendiente key={'w' + p.evento_id} p={p} tipo="wellness" />
            ))}
          </div>
        </Section>
      )}

      {rpe.length > 0 && (
        <Section title="RPE · después de entrenar o jugar">
          <div className="space-y-2">
            {rpe.map((p) => (
              <TarjetaPendiente key={'r' + p.evento_id} p={p} tipo="rpe" />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function TarjetaPendiente({ p, tipo }: { p: Pendiente; tipo: 'wellness' | 'rpe' }) {
  return (
    <Link
      to={`/${tipo}/${p.evento_id}`}
      className="card flex items-center justify-between p-4 transition hover:border-damm-red/40 hover:bg-white/[0.02]"
    >
      <div>
        <p className="font-semibold text-damm-ink">
          {nombreEvento({ tipo: p.tipo_evento, titulo: p.titulo })}
        </p>
        <p className="text-xs capitalize text-damm-faint">{formatFecha(p.fecha)}</p>
      </div>
      <span className="btn-primary px-3 py-1.5 text-xs">Rellenar →</span>
    </Link>
  )
}
