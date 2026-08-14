import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Evento } from '../../lib/types'
import { Spinner, ScaleInput } from '../../components/ui'
import { METRICAS_RPE, rpeATiempo, nombreEvento, formatFechaLarga } from '../../lib/utils'

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

  async function guardar() {
    if (!completo || !perfil || !evento) return
    setGuardando(true)
    setError('')
    const { error } = await supabase.from('rpe').insert({
      profile_id: perfil.id,
      evento_id: evento.id,
      rpe_muscular: vals.rpe_muscular,
      rpe_respiratorio: vals.rpe_respiratorio,
      a_tiempo: rpeATiempo(evento),
    })
    setGuardando(false)
    if (error) {
      setError(/duplicate|unique/i.test(error.message) ? 'Ya habías respondido esta encuesta.' : error.message)
      return
    }
    nav('/')
  }

  return (
    <div>
      <button onClick={() => nav('/')} className="mb-3 text-sm text-gray-400">← Volver</button>
      <h1 className="text-lg font-black text-damm-ink">RPE 🔥</h1>
      <p className="mb-1 text-sm text-gray-500">{nombreEvento(evento)}</p>
      <p className="mb-5 text-xs capitalize text-gray-400">{formatFechaLarga(evento.fecha)}</p>

      <div className="space-y-5">
        {METRICAS_RPE.map((m) => (
          <div key={m.key} className="card p-4">
            <label className="label">{m.label}</label>
            <ScaleInput value={vals[m.key]} onChange={(v) => setVals((s) => ({ ...s, [m.key]: v }))} min={m.min} max={m.max} />
          </div>
        ))}

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

        <button className="btn-primary w-full" disabled={!completo || guardando} onClick={guardar}>
          {guardando ? 'Guardando…' : completo ? 'Enviar RPE' : 'Responde las dos preguntas'}
        </button>
      </div>
    </div>
  )
}
