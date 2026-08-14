import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { Escudo } from '../../components/ui'

export default function PlayerLayout() {
  const { perfil, signOut } = useAuth()
  const nav = useNavigate()

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-gray-50">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-damm-red px-4 py-3 text-white shadow">
        <div className="flex items-center gap-2">
          <Escudo size={34} />
          <div className="leading-tight">
            <p className="text-sm font-bold">{perfil?.nombre}</p>
            <p className="text-[11px] text-white/70">Cadet A · CF Damm</p>
          </div>
        </div>
        <button
          onClick={async () => { await signOut(); nav('/') }}
          className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
        >
          Salir
        </button>
      </header>

      <main className="flex-1 px-4 py-5 pb-24">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-lg items-center justify-around border-t border-gray-200 bg-white/95 py-2 backdrop-blur">
        <Tab to="/" icon="🏠" label="Inicio" />
        <Tab to="/clasificacion" icon="🏆" label="Ranking" />
        <Tab to="/estadisticas" icon="📊" label="Mis datos" />
      </nav>
    </div>
  )
}

function Tab({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        'flex flex-col items-center gap-0.5 px-4 text-[11px] font-medium ' +
        (isActive ? 'text-damm-red' : 'text-gray-400')
      }
    >
      <span className="text-lg">{icon}</span>
      {label}
    </NavLink>
  )
}
