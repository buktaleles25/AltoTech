import type { SVGProps } from 'react'
import mascotUrl from '../assets/mascot.png'

type IconProps = SVGProps<SVGSVGElement>

/** น้องแมวทักซิโด้ มาสคอตของแอพ */
export function Mascot({ className }: { className?: string }) {
  return (
    <img
      src={mascotUrl}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`object-contain ${className ?? ''}`}
    />
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
