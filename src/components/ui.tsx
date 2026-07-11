import type { ButtonHTMLAttributes, ReactNode } from 'react'

// ---------- Card ----------
export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[1.75rem] border-2 border-sakura-100 bg-white/80 shadow-soft backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  )
}

// ---------- Button ----------
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-sakura-300 to-sakura-400 text-white shadow-cute hover:from-sakura-400 hover:to-sakura-500 border-white/60',
  secondary:
    'bg-lav-100 text-lav-500 border-lav-200 hover:bg-lav-200',
  ghost: 'bg-white/70 text-sakura-500 border-sakura-100 hover:bg-white',
  danger: 'bg-white/70 text-rose-400 border-rose-100 hover:bg-rose-50',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1',
  md: 'px-4 py-2.5 text-[0.95rem] gap-1.5',
  lg: 'px-5 py-3.5 text-lg gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full border-2 font-cute font-bold transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// ---------- Toggle switch ----------
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full border-2 transition-colors duration-200 ${
        checked ? 'border-sakura-300 bg-sakura-300' : 'border-lav-200 bg-lav-100'
      }`}
    >
      <span
        className={`absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-all duration-200 ${
          checked ? 'left-[1.35rem]' : 'left-0.5'
        }`}
      >
        {checked ? '♡' : ''}
      </span>
    </button>
  )
}

// ---------- Slider ----------
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
  icon,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  display?: string
  icon?: ReactNode
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-sm font-bold text-sakura-500">
        <span className="flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span className="rounded-full bg-sakura-50 px-2 py-0.5 text-xs text-sakura-400">
          {display ?? value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-sakura-100"
      />
    </label>
  )
}

// ---------- Segmented control ----------
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1 rounded-full bg-lav-100 p-1">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-full px-2 py-1.5 text-sm font-bold transition-all ${
            value === opt.value
              ? 'bg-white text-sakura-500 shadow-sm'
              : 'text-lav-500 hover:text-sakura-400'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ---------- Row (label + control) ----------
export function Row({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-bold text-sakura-500">{label}</span>
      {children}
    </div>
  )
}
