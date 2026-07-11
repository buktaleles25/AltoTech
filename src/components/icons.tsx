import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

/** น้องหยดน้ำ มาสคอตของแอพ (ธีมลายน้ำ = หยดน้ำ) ตาโต แก้มชมพู */
export function Mascot({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} {...props} aria-hidden="true">
      <defs>
        <linearGradient id="dropGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd1dc" />
          <stop offset="55%" stopColor="#ffb6c1" />
          <stop offset="100%" stopColor="#d6c8f5" />
        </linearGradient>
      </defs>
      <path
        d="M60 10 C 78 40 96 58 96 80 A 36 36 0 1 1 24 80 C 24 58 42 40 60 10 Z"
        fill="url(#dropGrad)"
        stroke="#ff8fab"
        strokeWidth="3"
      />
      {/* ประกายบนหยดน้ำ */}
      <path
        d="M46 52 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z"
        fill="#fff"
        opacity="0.85"
      />
      {/* ตา */}
      <ellipse cx="47" cy="82" rx="5" ry="7" fill="#6b3a4e" />
      <ellipse cx="73" cy="82" rx="5" ry="7" fill="#6b3a4e" />
      <circle cx="49" cy="79" r="1.8" fill="#fff" />
      <circle cx="75" cy="79" r="1.8" fill="#fff" />
      {/* แก้ม */}
      <ellipse cx="37" cy="93" rx="6" ry="4" fill="#ff8fab" opacity="0.55" />
      <ellipse cx="83" cy="93" rx="6" ry="4" fill="#ff8fab" opacity="0.55" />
      {/* ปาก */}
      <path
        d="M53 92 Q60 99 67 92"
        fill="none"
        stroke="#6b3a4e"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function HeartIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...props} aria-hidden="true">
      <path
        d="M12 20s-7-4.6-9.3-8.3C1 8.6 2.4 5.5 5.5 5.1 7.4 4.9 9 6 12 8.7c3-2.7 4.6-3.8 6.5-3.6 3.1.4 4.5 3.5 2.8 6.6C19 15.4 12 20 12 20Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function StarIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...props} aria-hidden="true">
      <path
        d="M12 3l2.5 5.6 6.1.6-4.6 4 1.4 6L12 20l-5.4 3.2 1.4-6-4.6-4 6.1-.6L12 3Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function SparkleIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...props} aria-hidden="true">
      <path
        d="M12 2c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function BowIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...props} aria-hidden="true">
      <path
        d="M12 12c-2-2.4-4.2-4-6-4-1.7 0-2.5 1.3-2.5 4S4.3 20 6 20c1.8 0 4-1.6 6-4 2 2.4 4.2 4 6 4 1.7 0 2.5-1.3 2.5-4S19.7 8 18 8c-1.8 0-4 1.6-6 4Z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="2" fill="#fff" opacity="0.6" />
    </svg>
  )
}

export function PlusIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props} aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function CameraIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props} aria-hidden="true">
      <path
        d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export function TrashIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props} aria-hidden="true">
      <path
        d="M5 7h14M10 7V5h4v2M6 7l1 12h10l1-12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ShareIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props} aria-hidden="true">
      <path
        d="M12 3v12M12 3 8 7M12 3l4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 11H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function DownloadIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props} aria-hidden="true">
      <path
        d="M12 3v12M12 15l-4-4M12 15l4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function CheckIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props} aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function XIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props} aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ImageIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="8.5" cy="9.5" r="1.8" fill="currentColor" />
      <path
        d="M4 17l5-5 4 4 3-3 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
