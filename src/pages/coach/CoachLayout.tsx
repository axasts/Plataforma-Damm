import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { Escudo } from '../../components/ui'

const LINKS = [
  { to: '/', label: 'Panel', icon: '📋', end: true },
  { to: '/puntos', label: 'Puntos', icon: '⚽' },
  { to: '/clasificacion', label: 'Ranking', icon: '🏆' },
  { to: '/calendario', label: 'Calendario', icon: '📅' },
  { to: '/asistencia', label: 'Asistencia', icon: '✅' },
  { to: '/lesiones', label: 'Lesiones', icon: '🩹' },
  { to: '/catalogo', label: 'Sanciones', icon: '📖' },
  { to: '/alertas', label: 'Alertas', icon: '🚨' },
  { to: '/plantilla', label: 'Plantilla', icon: '👥' },
]

export default function CoachLayout() {
  const { perfil, signOut } = useAuth()
  const nav = useNavigate()

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-gray-50">
      <header className="sticky top-0 z-30 bg-damm-red text-white shadow">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Escudo size={34} />
            <div className="leading-tight">
              <p className="text-sm font-bold">{perfil?.nombre} · Entrenador</p>
              <p className="text-[11px] text-white/70">Cadet A · CF Damm</p>
            </div>
          </div>
          <button
            onClick={async () => { await signOut(); nav('/') }}
            className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
          >
            Salir
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                'flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ' +
                (isActive ? 'bg-white text-damm-red' : 'bg-white/15 text-white hover:bg-white/25')
              }
            >
              <span>{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 py-5">
        <Outlet />
      </main>
    </div>
  )
}
