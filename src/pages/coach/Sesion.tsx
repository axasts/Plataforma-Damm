import { useEffect, useState, ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Evento, Motivo } from '../../lib/types'
import { Spinner, EmptyState, Modal, IconTrash, PageHeader } from '../../components/ui'
import { formatFechaLarga, nombreEvento } from '../../lib/utils'

interface Jug { id: string; nombre: string }
interface Punto { id: string; profile_id: string; puntos: number; motivo: string | null }
type Estado = 'ok' | 'lesionado' | 'no_vino'

export default function Sesion() {
  const { eventoId } = useParams()
  const { perfil } = useAuth()
  const nav = useNavigate()
  const [evento, setEvento] = useState<Evento | null>(null)
  const [jugadores, setJugadores] = useState<Jug[]>([])
  const [motivos, setMotivos] = useState<Motivo[]>([])
  const [puntos, setPuntos] = useState<Punto[]>([])
  const [estados, setEstados] = useState<Record<string, Estado>>({}) // entreno: asistencia
  const [desc, setDesc] = useState<Set<string>>(new Set())           // partido: no convocados
  const [exen, setExen] = useState<Set<string>>(new Set())           // encuestas excusadas: `${pid}:${tipo}`
  const [minutos, setMinutos] = useState<Record<string, string>>({}) // partido: minutos jugados por jugador
  const [lesionados, setLesionados] = useState<Set<string>>(new Set()) // lesión activa en la fecha
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState<null | 'ejercicio' | 'sancion'>(null)
  const [editando, setEditando] = useState(false)

  async function cargarPuntos(id: string) {
    const { data } = await supabase
      .from('puntos').select('id,profile_id,puntos,motivo')
      .eq('evento_id', id).order('created_at', { ascending: false })
    setPuntos((data as Punto[]) ?? [])
  }

  useEffect(() => {
    if (!eventoId) return
    async function init() {
      const [ev, j, m] = await Promise.all([
        supabase.from('eventos').select('*').eq('id', eventoId).maybeSingle(),
        supabase.from('perfiles').select('id,nombre').eq('rol', 'jugador').eq('demo', false).order('nombre'),
        supabase.from('motivos_puntos').select('*').eq('activo', true).order('categoria').order('nombre'),
      ])
      const e = ev.data as Evento
      setEvento(e)
      setJugadores((j.data as Jug[]) ?? [])
      setMotivos((m.data as Motivo[]) ?? [])
      if (e?.tipo === 'partido') {
        const { data } = await supabase.from('desconvocados').select('profile_id').eq('evento_id', eventoId)
        setDesc(new Set(((data as any[]) ?? []).map((x) => x.profile_id)))
        const { data: mins } = await supabase.from('minutos_jugados').select('profile_id,minutos').eq('evento_id', eventoId)
        const mp: Record<string, string> = {}
        ;((mins as any[]) ?? []).forEach((r) => (mp[r.profile_id] = String(r.minutos)))
        setMinutos(mp)
      } else {
        const { data } = await supabase.from('asistencia').select('profile_id,estado').eq('evento_id', eventoId)
        const mp: Record<string, Estado> = {}
        ;((data as any[]) ?? []).forEach((r) => (mp[r.profile_id] = r.estado))
        setEstados(mp)
      }
      // Encuestas excusadas por el entrenador para este evento
      const { data: ex } = await supabase.from('exenciones').select('profile_id,tipo').eq('evento_id', eventoId)
      setExen(new Set(((ex as any[]) ?? []).map((x) => `${x.profile_id}:${x.tipo}`)))
      // Lesiones activas en la fecha del evento → pre-marcar como lesionado
      const { data: les } = await supabase.from('lesiones').select('profile_id').lte('fecha_inicio', e.fecha).gte('fecha_fin', e.fecha)
      setLesionados(new Set(((les as any[]) ?? []).map((x) => x.profile_id)))
      await cargarPuntos(eventoId!)
      setCargando(false)
    }
    init()
  }, [eventoId])

  if (cargando || !evento) return <Spinner />

  const esPartido = evento.tipo === 'partido'
  const ev = evento
  const nombreDe = (id: string) => jugadores.find((x) => x.id === id)?.nombre ?? '—'
  const estadoEfectivo = (pid: string): Estado => estados[pid] ?? (lesionados.has(pid) ? 'lesionado' : 'ok')

  async function cambiarAsistencia(pid: string, estado: Estado) {
    setEstados((s) => ({ ...s, [pid]: estado }))
    if (estado === 'ok') await supabase.from('asistencia').delete().eq('evento_id', ev.id).eq('profile_id', pid)
    else await supabase.from('asistencia').upsert({ evento_id: ev.id, profile_id: pid, estado }, { onConflict: 'evento_id,profile_id' })
  }

  async function toggleConvocatoria(pid: string) {
    if (desc.has(pid)) {
      await supabase.from('desconvocados').delete().eq('evento_id', ev.id).eq('profile_id', pid)
      setDesc((s) => { const n = new Set(s); n.delete(pid); return n })
    } else {
      await supabase.from('desconvocados').insert({ evento_id: ev.id, profile_id: pid })
      setDesc((s) => new Set(s).add(pid))
    }
  }

  // Guarda los minutos jugados de un jugador (vacío = borra la fila).
  async function guardarMinutos(pid: string, valor: string) {
    const limpio = valor.trim()
    setMinutos((m) => ({ ...m, [pid]: limpio }))
    if (limpio === '') {
      await supabase.from('minutos_jugados').delete().eq('evento_id', ev.id).eq('profile_id', pid)
      return
    }
    const n = Math.max(0, Math.min(200, parseInt(limpio, 10) || 0))
    setMinutos((m) => ({ ...m, [pid]: String(n) }))
    await supabase.from('minutos_jugados').upsert(
      { evento_id: ev.id, profile_id: pid, minutos: n },
      { onConflict: 'evento_id,profile_id' },
    )
  }

  async function toggleExencion(pid: string, tipo: 'wellness' | 'rpe') {
    const key = `${pid}:${tipo}`
    if (exen.has(key)) {
      await supabase.from('exenciones').delete().eq('evento_id', ev.id).eq('profile_id', pid).eq('tipo', tipo)
      setExen((s) => { const n = new Set(s); n.delete(key); return n })
    } else {
      await supabase.from('exenciones').insert({ evento_id: ev.id, profile_id: pid, tipo })
      setExen((s) => new Set(s).add(key))
    }
  }

  // Excusa (o vuelve a exigir) una encuesta a TODA la plantilla de golpe.
  async function excusarTodos(tipo: 'wellness' | 'rpe', excusar: boolean) {
    if (excusar) {
      const nuevos = jugadores.filter((j) => !exen.has(`${j.id}:${tipo}`))
      if (nuevos.length > 0) {
        await supabase.from('exenciones').insert(nuevos.map((j) => ({ evento_id: ev.id, profile_id: j.id, tipo })))
      }
      setExen((s) => { const n = new Set(s); jugadores.forEach((j) => n.add(`${j.id}:${tipo}`)); return n })
    } else {
      await supabase.from('exenciones').delete().eq('evento_id', ev.id).eq('tipo', tipo)
      setExen((s) => { const n = new Set(s); jugadores.forEach((j) => n.delete(`${j.id}:${tipo}`)); return n })
    }
  }

  async function aplicar(pids: string[], pts: number, motivo: string, motivo_id: string | null) {
    if (pids.length === 0) return
    const filas = pids.map((pid) => ({
      profile_id: pid, puntos: pts, motivo, motivo_id,
      evento_id: ev.id, fecha: ev.fecha, registrado_por: perfil?.id ?? null,
    }))
    await supabase.from('puntos').insert(filas)
    await cargarPuntos(ev.id)
    setModal(null)
  }

  async function borrarPunto(id: string) {
    await supabase.from('puntos').delete().eq('id', id)
    setPuntos((p) => p.filter((x) => x.id !== id))
  }

  // Un jugador lesionado NO está disponible para ser convocado.
  const disponibles = jugadores.filter((j) => !lesionados.has(j.id))
  const convocados = disponibles.filter((j) => !desc.has(j.id)).length
  const wellnessExcusados = jugadores.filter((j) => exen.has(`${j.id}:wellness`)).length
  const rpeExcusados = jugadores.filter((j) => exen.has(`${j.id}:rpe`)).length

  return (
    <div>
      <button onClick={() => nav('/calendario')} className="mb-4 text-sm text-damm-faint transition hover:text-damm-muted">← Calendario</button>
      <PageHeader
        eyebrow={esPartido ? 'Partido' : 'Entrenamiento'}
        title={nombreEvento(evento)}
        subtitle={`${formatFechaLarga(evento.fecha)}${evento.hora ? ` · ${evento.hora.slice(0, 5)}` : ''}`}
        action={<button className="btn-ghost px-3 py-2 text-xs" onClick={() => setEditando(true)}>Editar</button>}
      />

      {/* Disponibilidad / Convocatoria */}
      <section className="mb-9">
        <div className="mb-3 flex items-center justify-between border-b border-damm-line2 pb-2">
          <h2 className="eyebrow text-damm-muted">{esPartido ? 'Convocatoria' : 'Disponibilidad'}</h2>
          <span className="text-xs tabular-nums text-damm-faint">
            {esPartido ? `${convocados} convocados` : `${jugadores.length} jugadores`}
          </span>
        </div>
        <div className="divide-y divide-damm-line">
          {jugadores.map((j) => esPartido ? (
            <div key={j.id} className="flex items-center justify-between py-2.5">
              <span className="flex items-center gap-2">
                <span className={'text-sm ' + (lesionados.has(j.id) || desc.has(j.id) ? 'text-damm-faint line-through' : 'text-damm-ink')}>{j.nombre}</span>
                {lesionados.has(j.id) && <span className="chip bg-damm-gold/15 text-damm-gold">Lesión</span>}
              </span>
              {lesionados.has(j.id) ? (
                <span className="rounded-md px-3 py-1 text-xs font-semibold text-damm-faint">No disponible</span>
              ) : (
                <button
                  onClick={() => toggleConvocatoria(j.id)}
                  className={'rounded-md px-3 py-1 text-xs font-semibold transition ' + (desc.has(j.id) ? 'text-damm-faint hover:text-damm-ink' : 'bg-damm-good/15 text-damm-good')}
                >
                  {desc.has(j.id) ? 'No convocado' : 'Convocado'}
                </button>
              )}
            </div>
          ) : (
            <div key={j.id} className="flex items-center justify-between py-2.5">
              <span className="flex items-center gap-2">
                <span className="text-sm text-damm-ink">{j.nombre}</span>
                {lesionados.has(j.id) && <span className="chip bg-damm-gold/15 text-damm-gold">Lesión</span>}
              </span>
              <div className="flex gap-1 rounded-lg border border-damm-line bg-white/[0.03] p-0.5 text-xs font-semibold">
                <EstBtn on={estadoEfectivo(j.id) === 'ok'} cls="bg-damm-good text-black" onClick={() => cambiarAsistencia(j.id, 'ok')}>OK</EstBtn>
                <EstBtn on={estadoEfectivo(j.id) === 'lesionado'} cls="bg-damm-gold text-black" onClick={() => cambiarAsistencia(j.id, 'lesionado')}>Lesión</EstBtn>
                <EstBtn on={estadoEfectivo(j.id) === 'no_vino'} cls="bg-damm-red text-white" onClick={() => cambiarAsistencia(j.id, 'no_vino')}>No vino</EstBtn>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Minutos jugados (solo partido) */}
      {esPartido && (
        <section className="mb-9">
          <div className="mb-1 flex items-center justify-between border-b border-damm-line2 pb-2">
            <h2 className="eyebrow text-damm-muted">Minutos jugados</h2>
            <span className="text-xs tabular-nums text-damm-faint">{convocados} convocados</span>
          </div>
          <p className="mb-3 mt-2 text-xs text-damm-faint">
            Solo jugadores convocados. Sirve para cruzar la carga (minutos) con el RPE y el wellness.
          </p>
          <div className="divide-y divide-damm-line">
            {disponibles.filter((j) => !desc.has(j.id)).map((j) => (
              <div key={j.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm text-damm-ink">{j.nombre}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={200} inputMode="numeric"
                    value={minutos[j.id] ?? ''}
                    onChange={(e) => setMinutos((m) => ({ ...m, [j.id]: e.target.value }))}
                    onBlur={(e) => guardarMinutos(j.id, e.target.value)}
                    placeholder="—"
                    className="input w-20 text-center font-display text-base font-bold tabular-nums"
                  />
                  <span className="w-8 text-xs text-damm-faint">min</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Encuestas: excusar wellness / RPE (deja de salir como pendiente) */}
      <section className="mb-9">
        <div className="mb-1 flex items-center justify-between border-b border-damm-line2 pb-2">
          <h2 className="eyebrow text-damm-muted">Encuestas pendientes</h2>
          <span className="text-xs tabular-nums text-damm-faint">
            {jugadores.length - wellnessExcusados}·W {jugadores.length - rpeExcusados}·R exigidas
          </span>
        </div>
        <p className="mb-3 mt-2 text-xs text-damm-faint">
          Excusa una encuesta y ese jugador dejará de tenerla como pendiente para esta sesión. No afecta a puntos ni asistencia.
        </p>

        {/* Acciones rápidas para toda la plantilla */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <BulkBtn label="Wellness" excusados={wellnessExcusados} total={jugadores.length} onExcusar={() => excusarTodos('wellness', true)} onExigir={() => excusarTodos('wellness', false)} />
          <BulkBtn label="RPE" excusados={rpeExcusados} total={jugadores.length} onExcusar={() => excusarTodos('rpe', true)} onExigir={() => excusarTodos('rpe', false)} />
        </div>

        <div className="divide-y divide-damm-line">
          {jugadores.map((j) => (
            <div key={j.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm text-damm-ink">{j.nombre}</span>
              <div className="flex gap-1.5">
                <EncBtn label="Wellness" excusado={exen.has(`${j.id}:wellness`)} onClick={() => toggleExencion(j.id, 'wellness')} />
                <EncBtn label="RPE" excusado={exen.has(`${j.id}:rpe`)} onClick={() => toggleExencion(j.id, 'rpe')} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Puntos de la sesión */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between border-b border-damm-line2 pb-2">
          <h2 className="eyebrow text-damm-muted">Puntos de la sesión</h2>
          <div className="flex gap-2">
            <button className="btn-gold px-2.5 py-1.5 text-xs" onClick={() => setModal('ejercicio')}>+ Ejercicio</button>
            <button className="btn-danger px-2.5 py-1.5 text-xs" onClick={() => setModal('sancion')}>+ Sanción</button>
          </div>
        </div>
        {puntos.length === 0 ? (
          <EmptyState>Sin puntos en esta sesión todavía.</EmptyState>
        ) : (
          <div>
            {puntos.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-damm-line py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm text-damm-ink">
                  {nombreDe(p.profile_id)} <span className="text-damm-faint">· {p.motivo}</span>
                </span>
                <span className={'font-display text-base font-bold tabular-nums ' + (p.puntos >= 0 ? 'text-damm-good' : 'text-damm-red')}>
                  {p.puntos > 0 ? '+' : ''}{p.puntos}
                </span>
                <button onClick={() => borrarPunto(p.id)} className="rounded p-1.5 text-damm-faint transition hover:bg-white/5 hover:text-damm-red" aria-label="Eliminar"><IconTrash /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {modal === 'ejercicio' && (
        <EjercicioModal jugadores={jugadores} onClose={() => setModal(null)} onApply={(pids, pts, nom) => aplicar(pids, pts, nom, null)} />
      )}
      {modal === 'sancion' && (
        <SancionModal jugadores={jugadores} motivos={motivos} defecto={esPartido ? 'partido' : 'entrenamiento'} onClose={() => setModal(null)} onApply={(pids, m) => aplicar(pids, m.puntos, m.nombre, m.id)} />
      )}
      {editando && (
        <EditarEventoModal evento={ev} onClose={() => setEditando(false)} onSaved={(e) => { setEvento(e); setEditando(false) }} />
      )}
    </div>
  )
}

function EditarEventoModal({ evento, onClose, onSaved }: {
  evento: Evento; onClose: () => void; onSaved: (e: Evento) => void
}) {
  const esPartido = evento.tipo === 'partido'
  const [fecha, setFecha] = useState(evento.fecha)
  const [hora, setHora] = useState(evento.hora ? evento.hora.slice(0, 5) : '')
  const [rival, setRival] = useState(evento.rival ?? '')
  const [titulo, setTitulo] = useState(evento.titulo ?? '')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    setGuardando(true)
    const cambios = {
      fecha,
      hora: esPartido ? (hora || null) : evento.hora,
      rival: esPartido ? (rival.trim() || null) : evento.rival,
      titulo: titulo.trim() || null,
    }
    const { error } = await supabase.from('eventos').update(cambios).eq('id', evento.id)
    setGuardando(false)
    if (error) { window.alert(error.message); return }
    onSaved({ ...evento, ...cambios })
  }

  return (
    <Modal open onClose={onClose} title={esPartido ? 'Editar partido' : 'Editar entrenamiento'}>
      <div className="space-y-3">
        {esPartido && (
          <div>
            <label className="label">Rival</label>
            <input className="input" value={rival} onChange={(e) => setRival(e.target.value)} placeholder="Ej: Sant Just" />
          </div>
        )}
        <div>
          <label className="label">Título {esPartido ? '(opcional)' : ''}</label>
          <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={esPartido ? 'Partido' : 'Entrenamiento'} />
        </div>
        <div>
          <label className="label">Fecha</label>
          <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        {esPartido && (
          <div>
            <label className="label">Hora (convocatoria / partido)</label>
            <input className="input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
        )}
        <button className="btn-primary w-full" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
      </div>
    </Modal>
  )
}

function EstBtn({ on, cls, onClick, children }: { on: boolean; cls: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={'rounded-md px-2.5 py-1 transition ' + (on ? cls : 'text-damm-muted hover:text-damm-ink')}>{children}</button>
  )
}

// Toggle por jugador: exigida (activo) ↔ excusada.
function EncBtn({ label, excusado, onClick }: { label: string; excusado: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={excusado ? `${label} excusada · pulsa para volver a exigirla` : `${label} exigida · pulsa para excusar`}
      className={
        'rounded-md px-2.5 py-1 text-xs font-semibold transition ' +
        (excusado
          ? 'text-damm-faint line-through hover:text-damm-ink'
          : 'bg-damm-good/15 text-damm-good hover:bg-damm-good/25')
      }
    >
      {label}
    </button>
  )
}

// Acción rápida para toda la plantilla.
function BulkBtn({ label, excusados, total, onExcusar, onExigir }: {
  label: string; excusados: number; total: number; onExcusar: () => void; onExigir: () => void
}) {
  const todos = total > 0 && excusados === total
  return (
    <button
      onClick={todos ? onExigir : onExcusar}
      className="rounded-lg border border-damm-line bg-white/[0.03] px-3 py-2 text-xs font-semibold text-damm-muted transition hover:text-damm-ink"
    >
      {todos ? `Exigir ${label} a todos` : `Excusar ${label} a todos`}
      {excusados > 0 && !todos && <span className="ml-1 text-damm-faint">({excusados}/{total})</span>}
    </button>
  )
}

function ChipsJugadores({ jugadores, sel, toggle }: { jugadores: Jug[]; sel: Set<string>; toggle: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {jugadores.map((j) => (
        <button
          key={j.id}
          type="button"
          onClick={() => toggle(j.id)}
          className={'chip cursor-pointer border transition ' + (sel.has(j.id) ? 'border-damm-red bg-damm-red text-white' : 'border-damm-line bg-white/[0.04] text-damm-muted hover:bg-white/[0.08]')}
        >
          {j.nombre}
        </button>
      ))}
    </div>
  )
}

function EjercicioModal({ jugadores, onClose, onApply }: {
  jugadores: Jug[]; onClose: () => void; onApply: (pids: string[], pts: number, nombre: string) => void
}) {
  const [nombre, setNombre] = useState('')
  const [puntos, setPuntos] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const valido = nombre.trim() !== '' && puntos !== '' && Number(puntos) > 0 && sel.size > 0

  return (
    <Modal open onClose={onClose} title="Ejercicio que puntúa">
      <div className="space-y-4">
        <div>
          <label className="label">Nombre del ejercicio</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Rondo competitivo" />
        </div>
        <div>
          <label className="label">Puntos a sumar</label>
          <input className="input" type="number" min={1} value={puntos} onChange={(e) => setPuntos(e.target.value)} placeholder="Ej: 10" />
        </div>
        <div>
          <label className="label">Jugadores que lo ganan ({sel.size})</label>
          <ChipsJugadores jugadores={jugadores} sel={sel} toggle={toggle} />
        </div>
        <button className="btn-primary w-full" disabled={!valido} onClick={() => onApply([...sel], Math.abs(parseInt(puntos, 10)), nombre.trim())}>
          Sumar a {sel.size} jugador{sel.size !== 1 ? 'es' : ''}
        </button>
      </div>
    </Modal>
  )
}

function SancionModal({ jugadores, motivos, defecto, onClose, onApply }: {
  jugadores: Jug[]; motivos: Motivo[]; defecto: string; onClose: () => void; onApply: (pids: string[], m: Motivo) => void
}) {
  const [cat, setCat] = useState(defecto)
  const [motivoId, setMotivoId] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const lista = motivos.filter((m) => m.categoria === cat)
  const motivo = motivos.find((m) => m.id === motivoId) ?? null
  const valido = motivo !== null && sel.size > 0

  return (
    <Modal open onClose={onClose} title="Aplicar sanción">
      <div className="space-y-4">
        <div className="flex gap-1 rounded-lg border border-damm-line bg-white/[0.03] p-1 text-xs font-semibold">
          <button className={'flex-1 rounded px-2 py-1 transition ' + (cat === 'entrenamiento' ? 'bg-damm-red text-white' : 'text-damm-muted hover:text-damm-ink')} onClick={() => { setCat('entrenamiento'); setMotivoId('') }}>Entreno</button>
          <button className={'flex-1 rounded px-2 py-1 transition ' + (cat === 'partido' ? 'bg-damm-red text-white' : 'text-damm-muted hover:text-damm-ink')} onClick={() => { setCat('partido'); setMotivoId('') }}>Partido</button>
        </div>
        <div>
          <label className="label">Motivo</label>
          <div className="max-h-52 overflow-y-auto rounded-lg border border-damm-line divide-y divide-damm-line">
            {lista.map((mo) => {
              const on = motivoId === mo.id
              return (
                <button
                  key={mo.id}
                  type="button"
                  onClick={() => setMotivoId(mo.id)}
                  className={'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition ' + (on ? 'bg-damm-red/15 text-damm-ink' : 'text-damm-muted hover:bg-white/[0.04] hover:text-damm-ink')}
                >
                  <span className="min-w-0 truncate">{mo.nombre}</span>
                  <span className={'shrink-0 font-display font-bold tabular-nums ' + (mo.puntos >= 0 ? 'text-damm-good' : 'text-damm-red')}>{mo.puntos > 0 ? '+' : ''}{mo.puntos}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <label className="label">Jugadores ({sel.size})</label>
          <ChipsJugadores jugadores={jugadores} sel={sel} toggle={toggle} />
        </div>
        <button className="btn-primary w-full" disabled={!valido} onClick={() => motivo && onApply([...sel], motivo)}>
          Aplicar a {sel.size} jugador{sel.size !== 1 ? 'es' : ''}
        </button>
      </div>
    </Modal>
  )
}
