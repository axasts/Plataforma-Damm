import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ReglaAlerta } from '../../lib/types'
import { Spinner, Section, EmptyState, Badge, Modal } from '../../components/ui'
import { ETIQUETAS_METRICA } from '../../lib/utils'

const METRICAS = ['rpe_muscular', 'rpe_respiratorio', 'sueno', 'fatiga', 'dolor_muscular', 'estres', 'animo']

export default function ReglasAlertaPage() {
  const [reglas, setReglas] = useState<ReglaAlerta[]>([])
  const [cargando, setCargando] = useState(true)
  const [nueva, setNueva] = useState(false)

  async function cargar() {
    const { data } = await supabase.from('reglas_alerta').select('*').order('metrica')
    setReglas((data as ReglaAlerta[]) ?? [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  async function toggle(r: ReglaAlerta) {
    await supabase.from('reglas_alerta').update({ activa: !r.activa }).eq('id', r.id)
    cargar()
  }
  async function borrar(id: string) {
    await supabase.from('reglas_alerta').delete().eq('id', id)
    cargar()
  }

  if (cargando) return <Spinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-black text-damm-ink">Alertas de picos 🚨</h1>
        <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => setNueva(true)}>+ Nueva</button>
      </div>
      <p className="mb-5 text-sm text-gray-500">Define cuándo quieres que el panel te avise. Ej: RPE muscular ≥ 9, o sueño ≤ 2.</p>

      <Section title="Reglas">
        {reglas.length === 0 ? (
          <EmptyState>No hay reglas. Crea la primera.</EmptyState>
        ) : (
          <div className="card divide-y divide-gray-100">
            {reglas.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-damm-ink">{ETIQUETAS_METRICA[r.metrica] ?? r.metrica}</p>
                  <p className="text-xs text-gray-400">Avisar si {r.operador} {r.valor}</p>
                </div>
                {r.activa ? <Badge color="green">Activa</Badge> : <Badge color="gray">Inactiva</Badge>}
                <button onClick={() => toggle(r)} className="ml-3 text-xs text-gray-400 hover:text-damm-red">{r.activa ? 'Desactivar' : 'Activar'}</button>
                <button onClick={() => borrar(r.id)} className="ml-2 text-gray-300 hover:text-red-500" aria-label="Eliminar">🗑</button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {nueva && <ReglaModal onClose={() => setNueva(false)} onSaved={() => { setNueva(false); cargar() }} />}
    </div>
  )
}

function ReglaModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [metrica, setMetrica] = useState('rpe_muscular')
  const [operador, setOperador] = useState<'>=' | '<='>('>=')
  const [valor, setValor] = useState('9')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    setGuardando(true)
    await supabase.from('reglas_alerta').insert({ metrica, operador, valor: parseInt(valor, 10) })
    setGuardando(false)
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title="Nueva regla de alerta">
      <div className="space-y-3">
        <div>
          <label className="label">Métrica</label>
          <select className="input" value={metrica} onChange={(e) => setMetrica(e.target.value)}>
            {METRICAS.map((m) => <option key={m} value={m}>{ETIQUETAS_METRICA[m]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Condición</label>
          <select className="input" value={operador} onChange={(e) => setOperador(e.target.value as any)}>
            <option value=">=">Mayor o igual (≥)</option>
            <option value="<=">Menor o igual (≤)</option>
          </select>
        </div>
        <div>
          <label className="label">Valor (0–10)</label>
          <input className="input" type="number" min={0} max={10} value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
        <button className="btn-primary w-full" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Crear regla'}</button>
      </div>
    </Modal>
  )
}
