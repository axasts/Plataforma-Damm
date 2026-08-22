import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { Escudo } from '../../components/ui'

const LINKS = [
  { to: '/', label: 'Panel', end: true },
  { to: '/calendario', label: 'Calendario' },
  { to: '/encuestas', label: 'Encuestas' },
  { to: '/datos', label: 'Datos' },
  { to: '/clasificacion', label: 'Ranking' },
  { to: '/lesiones', label: 'Lesiones' },
  { to: '/catalogo', label: 'Sanciones' },
  { to: '/alertas', label: 'Alertas' },
  { to: '/plantilla', label: 'Plantilla' },
]

export default function CoachLayout() {
  const { perfil, signOut } = useAuth()
  const nav = useNavigate()

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-damm-bg">
      <header className="sticky top-0 z-30 border-b border-damm-line bg-damm-bg/85 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Escudo size={30} />
            <div className="leading-tight">
              <p className="font-display text-[13px] font-bold tracking-wide">CADET A · CF DAMM</p>
              <p className="text-[11px] text-damm-faint">{perfil?.nombre} · Entrenador</p>
            </div>
          </div>
          <button
            onClick={async () => { await signOut(); nav('/') }}
            className="rounded-lg border border-damm-line px-3 py-1.5 text-xs font-semibold text-damm-muted transition hover:bg-white/5 hover:text-damm-ink"
          >
            Salir
          </button>
        </div>
        <nav className="flex gap-5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                'relative shrink-0 border-b-2 py-2.5 text-[13px] font-semibold transition ' +
                (isActive
                  ? 'border-damm-red text-damm-ink'
                  : 'border-transparent text-damm-faint hover:text-damm-muted')
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
