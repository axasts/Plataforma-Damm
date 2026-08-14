import { ReactNode } from 'react'

// Escut estilitzat del CF Damm (vermell + estrella daurada).
export function Escudo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 110" aria-label="CF Damm">
      <path
        d="M50 4 L94 16 V60 C94 86 72 100 50 106 C28 100 6 86 6 60 V16 Z"
        fill="#C8102E"
        stroke="#F4C300"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M50 22 l8.5 17.2 19 2.8 -13.7 13.4 3.2 18.9 L50 65.4 32.8 74.3 36 55.4 22.3 42 41.3 39.2 Z"
        fill="#F4C300"
      />
      <circle cx="50" cy="52" r="8.5" fill="#C8102E" />
    </svg>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-damm-red" />
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
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-damm-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="card p-6 text-center text-sm text-gray-500">{children}</div>
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg rounded-b-none sm:rounded-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h3 className="font-bold text-damm-ink">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// Selector 0–10 amb color segons el valor.
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
                  ? 'bg-damm-red text-white ring-2 ring-damm-red/40 scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
              }
            >
              {n}
            </button>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-gray-400">
        <span>0 · {min}</span>
        <span>{max} · 10</span>
      </div>
    </div>
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
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    gold: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
  }
  return <span className={'chip ' + map[color]}>{children}</span>
}
