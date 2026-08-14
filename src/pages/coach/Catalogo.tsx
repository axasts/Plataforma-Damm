import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Motivo } from '../../lib/types'
import { Spinner, Section, Badge, Modal } from '../../components/ui'

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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-black text-damm-ink">Catálogo de sanciones 📖</h1>
        <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => setNuevo(true)}>+ Nuevo</button>
      </div>
      <p className="mb-5 text-sm text-gray-500">El reglamento es dinámico: edita, desactiva o crea motivos cuando quieras.</p>

      {grupos.map((g) => {
        const items = motivos.filter((m) => m.categoria === g.cat)
        if (items.length === 0) return null
        return (
          <Section key={g.cat} title={g.label}>
            <div className="card divide-y divide-gray-100">
              {items.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className={'truncate text-sm ' + (m.activo ? 'text-damm-ink' : 'text-gray-400 line-through')}>{m.nombre}</p>
                  </div>
                  <Badge color={m.puntos >= 0 ? 'green' : 'red'}>{m.puntos > 0 ? '+' : ''}{m.puntos}</Badge>
                  <button onClick={() => toggleActivo(m)} className="ml-3 text-xs text-gray-400 hover:text-damm-red">{m.activo ? 'Ocultar' : 'Activar'}</button>
                  <button onClick={() => setEditar(m)} className="ml-2 text-gray-300 hover:text-damm-red" aria-label="Editar">✏️</button>
                  <button onClick={() => borrar(m.id)} className="ml-2 text-gray-300 hover:text-red-500" aria-label="Eliminar">🗑</button>
                </div>
              ))}
            </div>
          </Section>
        )
      })}

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
