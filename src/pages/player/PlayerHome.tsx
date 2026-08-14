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
      <div className="mb-6 flex items-center gap-3">
        <div className="relative">
          <span className="text-3xl">🔔</span>
          {pend.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-damm-gold px-1 text-xs font-bold text-damm-ink">
              {pend.length}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-lg font-black text-damm-ink">
            {pend.length === 0 ? '¡Todo al día!' : `Tienes ${pend.length} encuesta${pend.length > 1 ? 's' : ''} pendiente${pend.length > 1 ? 's' : ''}`}
          </h1>
          <p className="text-sm text-gray-500">
            {pend.length === 0 ? 'No te queda nada por rellenar.' : 'Rellénalas cuando puedas.'}
          </p>
        </div>
      </div>

      {pend.length === 0 && (
        <EmptyState>Gracias por mantener tus encuestas al día 💪</EmptyState>
      )}

      {wellness.length > 0 && (
        <Section title="🌙 Wellness (mañana)">
          <div className="space-y-2">
            {wellness.map((p) => (
              <TarjetaPendiente key={'w' + p.evento_id} p={p} tipo="wellness" />
            ))}
          </div>
        </Section>
      )}

      {rpe.length > 0 && (
        <Section title="🔥 RPE (después de entrenar/jugar)">
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
      className="card flex items-center justify-between p-4 hover:border-damm-red/40"
    >
      <div>
        <p className="font-semibold text-damm-ink">
          {nombreEvento({ tipo: p.tipo_evento, titulo: p.titulo })}
        </p>
        <p className="text-xs text-gray-400 capitalize">{formatFecha(p.fecha)}</p>
      </div>
      <span className="btn-primary px-3 py-1.5 text-xs">Rellenar →</span>
    </Link>
  )
}
