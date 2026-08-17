import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from '../../lib/auth'
import { Escudo } from '../../components/ui'

export default function PlayerLayout() {
  const { perfil, signOut } = useAuth()
  const nav = useNavigate()

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-damm-bg">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-damm-line bg-damm-bg/85 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <Escudo size={30} />
          <div className="leading-tight">
            <p className="font-display text-[13px] font-bold tracking-wide">{perfil?.nombre}</p>
            <p className="text-[11px] text-damm-faint">Cadet A · CF Damm</p>
          </div>
        </div>
        <button
          onClick={async () => { await signOut(); nav('/') }}
          className="rounded-lg border border-damm-line px-3 py-1.5 text-xs font-semibold text-damm-muted transition hover:bg-white/5 hover:text-damm-ink"
        >
          Salir
        </button>
      </header>

      <main className="flex-1 px-4 py-6 pb-24">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-lg items-center justify-around border-t border-damm-line bg-damm-panel/95 py-2 backdrop-blur">
        <Tab to="/" label="Inicio" icon={<IconHome />} />
        <Tab to="/clasificacion" label="Ranking" icon={<IconTrophy />} />
        <Tab to="/estadisticas" label="Mis datos" icon={<IconChart />} />
      </nav>
    </div>
  )
}

function Tab({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        'flex flex-col items-center gap-1 px-4 text-[11px] font-semibold transition ' +
        (isActive ? 'text-damm-red' : 'text-damm-faint hover:text-damm-muted')
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

const iconProps = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}
function IconHome() {
  return <svg {...iconProps}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
}
function IconTrophy() {
  return <svg {...iconProps}><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 21h6M12 13v4" /></svg>
}
function IconChart() {
  return <svg {...iconProps}><path d="M4 20V4M4 20h16M8 16v-4M13 16V8M18 16v-6" /></svg>
}
