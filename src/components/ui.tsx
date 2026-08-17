import { ReactNode } from 'react'
import escudoDamm from '../assets/escudo-damm.png'

// Escudo oficial del CF Damm.
export function Escudo({ size = 40 }: { size?: number }) {
  return (
    <img
      src={escudoDamm}
      alt="CF Damm"
      width={size}
      height={Math.round((size * 328) / 304)}
      className="object-contain"
      style={{ height: 'auto' }}
    />
  )
}

// Cabecera de página consistente: eyebrow + título grande (Archivo) + subtítulo.
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <header className="mb-7 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <span className="eyebrow text-damm-gold">{eyebrow}</span>}
        <h1 className="mt-1.5 font-display text-[26px] font-extrabold leading-none tracking-tight text-damm-ink">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-damm-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-damm-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-damm-line border-t-damm-red" />
      {label && <p className="mt-3 text-sm">{label}</p>}
    </div>
  )
}

export function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between border-b border-damm-line pb-2.5">
        <h2 className="eyebrow text-damm-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="card p-6 text-center text-sm text-damm-muted">{children}</div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg max-h-[88vh] overflow-y-auto bg-damm-panel2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-damm-line bg-damm-panel2/95 px-5 py-4 backdrop-blur">
          <h3 className="text-base font-bold text-damm-ink">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-damm-faint transition hover:bg-white/5 hover:text-damm-ink"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// Selector 0–10 amb el valor triat en vermell.
export function ScaleInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number | null
  onChange: (v: number) => void
  min: string
  max: string
}) {
  return (
    <div>
      <div className="grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => {
          const sel = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={
                'aspect-square rounded-md text-sm font-semibold transition ' +
                (sel
                  ? 'bg-damm-red text-white ring-2 ring-damm-red/40'
                  : 'bg-white/[0.04] text-damm-muted hover:bg-white/[0.09]')
              }
            >
              {n}
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-damm-faint">
        <span>0 · {min}</span>
        <span>{max} · 10</span>
      </div>
    </div>
  )
}

// Iconos de acción (líneas, sin emoji)
export function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
    </svg>
  )
}
export function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

export function Badge({
  color = 'gray',
  children,
}: {
  color?: 'gray' | 'green' | 'red' | 'gold' | 'blue'
  children: ReactNode
}) {
  const map = {
    gray: 'bg-white/[0.06] text-damm-muted',
    green: 'bg-damm-good/15 text-damm-good',
    red: 'bg-damm-red/15 text-[#ff6473]',
    gold: 'bg-damm-gold/15 text-damm-gold',
    blue: 'bg-sky-400/15 text-sky-300',
  }
  return <span className={'chip ' + map[color]}>{children}</span>
}
