import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Evento } from '../../lib/types'
import { Spinner, ScaleInput, PageHeader } from '../../components/ui'
import { METRICAS_RPE, rpePlazo, nombreEvento, formatFechaLarga } from '../../lib/utils'

export default function RpeForm() {
  const { eventoId } = useParams()
  const { perfil } = useAuth()
  const nav = useNavigate()
  const [evento, setEvento] = useState<Evento | null>(null)
  const [vals, setVals] = useState<Record<string, number | null>>({
    rpe_muscular: null, rpe_respiratorio: null,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('eventos').select('*').eq('id', eventoId).maybeSingle()
      .then(({ data }) => setEvento(data as Evento))
  }, [eventoId])

  if (!evento) return <Spinner />

  const completo = METRICAS_RPE.every((m) => vals[m.key] !== null)
  const plazo = rpePlazo(evento)

  async function guardar() {
    if (!completo || !perfil || !evento) return
    // Fuera de plazo definitivo: ya no se puede responder.
    const estado = rpePlazo(evento)
    if (estado === 'cerrado') {
      setError('El plazo para responder esta encuesta ya ha terminado.')
      return
    }
    // Cuenta demo: solo previsualización, no se guarda nada.
    if (perfil.demo) { nav('/'); return }
    setGuardando(true)
    setError('')
    const { error } = await supabase.from('rpe').insert({
      profile_id: perfil.id,
      evento_id: evento.id,
      rpe_muscular: vals.rpe_muscular,
      rpe_respiratorio: vals.rpe_respiratorio,
      a_tiempo: estado === 'a_tiempo',
    })
    setGuardando(false)
    if (error) {
      setError(/duplicate|unique/i.test(error.message) ? 'Ya habías respondido esta encuesta.' : error.message)
      return
    }
    nav('/')
  }

  const hechas = METRICAS_RPE.filter((m) => vals[m.key] !== null).length

  return (
    <div className="pb-24">
      <button onClick={() => nav('/')} className="mb-4 text-sm text-damm-faint transition hover:text-damm-muted">← Volver</button>
      <PageHeader
        eyebrow="Esfuerzo percibido"
        title="RPE"
        subtitle={`${nombreEvento(evento)} · ${formatFechaLarga(evento.fecha)}`}
        action={<span className="font-display text-sm font-bold tabular-nums text-damm-muted">{hechas}<span className="text-damm-faint">/{METRICAS_RPE.length}</span></span>}
      />

      {plazo !== 'a_tiempo' && (
        <div className={'mt-4 rounded-lg border px-3 py-2 text-sm ' + (plazo === 'cerrado' ? 'border-damm-red/30 bg-damm-red/10 text-[#ff8a95]' : 'border-damm-gold/30 bg-damm-gold/10 text-damm-gold')}>
          {plazo === 'cerrado'
            ? 'El plazo para responder ha terminado. Ya no se puede enviar esta encuesta.'
            : 'Fuera de plazo: puedes enviarla, pero contará como respondida tarde.'}
        </div>
      )}

      <div className="border-t border-damm-line">
        {METRICAS_RPE.map((m) => (
          <div key={m.key} className="border-b border-damm-line py-5">
            <label className="mb-3 block text-[15px] font-semibold text-damm-ink">{m.label}</label>
            <ScaleInput value={vals[m.key]} onChange={(v) => setVals((s) => ({ ...s, [m.key]: v }))} min={m.min} max={m.max} />
          </div>
        ))}
      </div>

      {error && <div className="mt-5 rounded-lg border border-damm-red/30 bg-damm-red/10 px-3 py-2 text-sm text-[#ff8a95]">{error}</div>}

      <button className="btn-primary mt-6 w-full py-3" disabled={!completo || guardando || plazo === 'cerrado'} onClick={guardar}>
        {guardando ? 'Guardando…' : plazo === 'cerrado' ? 'Plazo cerrado' : completo ? 'Enviar RPE' : `Faltan ${METRICAS_RPE.length - hechas} respuestas`}
      </button>
    </div>
  )
}
