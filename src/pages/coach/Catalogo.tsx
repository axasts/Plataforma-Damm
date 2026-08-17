import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Motivo } from '../../lib/types'
import { Spinner, Modal, IconTrash, IconEdit, PageHeader } from '../../components/ui'

export default function Catalogo() {
  const [motivos, setMotivos] = useState<Motivo[]>([])
  const [cargando, setCargando] = useState(true)
  const [editar, setEditar] = useState<Motivo | null>(null)
  const [nuevo, setNuevo] = useState(false)

  async function cargar() {
    const { data } = await supabase.from('motivos_puntos').select('*').order('categoria').order('nombre')
    setMotivos((data as Motivo[]) ?? [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  async function toggleActivo(m: Motivo) {
    await supabase.from('motivos_puntos').update({ activo: !m.activo }).eq('id', m.id)
    cargar()
  }
  async function borrar(id: string) {
    await supabase.from('motivos_puntos').delete().eq('id', id)
    cargar()
  }

  if (cargando) return <Spinner />

  const grupos: { cat: string; label: string }[] = [
    { cat: 'entrenamiento', label: 'Entrenamiento' },
    { cat: 'partido', label: 'Partido' },
    { cat: 'otro', label: 'Otros' },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Reglamento"
        title="Catálogo de sanciones"
        subtitle="Dinámico: edita, desactiva o crea motivos cuando quieras."
        action={<button className="btn-primary px-3 py-2 text-xs" onClick={() => setNuevo(true)}>+ Nuevo</button>}
      />

      <div className="space-y-9">
        {grupos.map((g) => {
          const items = motivos.filter((m) => m.categoria === g.cat)
          if (items.length === 0) return null
          return (
            <div key={g.cat}>
              <div className="mb-1 flex items-baseline justify-between border-b border-damm-line2 pb-2">
                <h2 className="eyebrow text-damm-muted">{g.label}</h2>
                <span className="text-xs tabular-nums text-damm-faint">{items.length} motivos</span>
              </div>
              {items.map((m) => (
                <div key={m.id} className="group flex items-center gap-3 border-b border-damm-line py-3">
                  <p className={'min-w-0 flex-1 truncate text-sm ' + (m.activo ? 'text-damm-ink' : 'text-damm-faint line-through')}>{m.nombre}</p>
                  <span className={'w-10 text-right font-display text-base font-bold tabular-nums ' + (m.puntos >= 0 ? 'text-damm-good' : 'text-damm-red')}>
                    {m.puntos > 0 ? '+' : ''}{m.puntos}
                  </span>
                  <div className="flex items-center gap-1 text-damm-faint">
                    <button onClick={() => toggleActivo(m)} className="rounded px-2 py-1 text-xs font-medium transition hover:bg-white/5 hover:text-damm-ink">{m.activo ? 'Ocultar' : 'Activar'}</button>
                    <button onClick={() => setEditar(m)} className="rounded p-1.5 transition hover:bg-white/5 hover:text-damm-ink" aria-label="Editar"><IconEdit /></button>
                    <button onClick={() => borrar(m.id)} className="rounded p-1.5 transition hover:bg-white/5 hover:text-damm-red" aria-label="Eliminar"><IconTrash /></button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {(editar || nuevo) && (
        <MotivoModal
          motivo={editar}
          onClose={() => { setEditar(null); setNuevo(false) }}
          onSaved={() => { setEditar(null); setNuevo(false); cargar() }}
        />
      )}
    </div>
  )
}

function MotivoModal({ motivo, onClose, onSaved }: {
  motivo: Motivo | null; onClose: () => void; onSaved: () => void
}) {
  const [nombre, setNombre] = useState(motivo?.nombre ?? '')
  const [puntos, setPuntos] = useState(String(motivo?.puntos ?? ''))
  const [categoria, setCategoria] = useState(motivo?.categoria ?? 'entrenamiento')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    setGuardando(true)
    const payload = { nombre, puntos: parseInt(puntos, 10), categoria }
    if (motivo) await supabase.from('motivos_puntos').update(payload).eq('id', motivo.id)
    else await supabase.from('motivos_puntos').insert(payload)
    setGuardando(false)
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title={motivo ? 'Editar motivo' : 'Nuevo motivo'}>
      <div className="space-y-3">
        <div>
          <label className="label">Nombre</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <label className="label">Puntos (con signo)</label>
          <input className="input" type="number" value={puntos} onChange={(e) => setPuntos(e.target.value)} placeholder="Ej: -2 o 5" />
        </div>
        <div>
          <label className="label">Categoría</label>
          <select className="input" value={categoria} onChange={(e) => setCategoria(e.target.value as any)}>
            <option value="entrenamiento">Entrenamiento</option>
            <option value="partido">Partido</option>
            <option value="otro">Otros</option>
          </select>
        </div>
        <button className="btn-primary w-full" disabled={!nombre || puntos === '' || guardando} onClick={guardar}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </Modal>
  )
}
