import type { Anchor } from '../types'
import { useI18n } from '../i18n'

const GRID: Anchor[] = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

interface Props {
  value: Anchor
  onChange: (a: Anchor) => void
}

export function PositionPicker({ value, onChange }: Props) {
  const { t } = useI18n()
  const tileActive = value === 'tile'

  return (
    <div className="space-y-2">
      <div
        className={`grid grid-cols-3 gap-1.5 rounded-2xl bg-lav-100 p-2 transition-opacity ${
          tileActive ? 'opacity-40' : ''
        }`}
      >
        {GRID.map((cell) => {
          const active = value === cell
          return (
            <button
              key={cell}
              type="button"
              aria-label={cell}
              onClick={() => onChange(cell)}
              className={`flex aspect-square items-center justify-center rounded-xl border-2 transition-all active:scale-90 ${
                active
                  ? 'border-sakura-300 bg-white shadow-sm'
                  : 'border-transparent bg-white/50 hover:bg-white/80'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  active ? 'scale-125 bg-sakura-400' : 'bg-lav-300'
                }`}
              />
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => onChange('tile')}
        className={`w-full rounded-2xl border-2 py-2 text-sm font-bold transition-all active:scale-95 ${
          tileActive
            ? 'border-sakura-300 bg-sakura-100 text-sakura-500'
            : 'border-lav-200 bg-white/60 text-lav-500'
        }`}
      >
        ▦ {t.tile}
      </button>
    </div>
  )
}
