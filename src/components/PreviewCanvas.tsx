import { useEffect, useRef, useState } from 'react'
import type { ImageItem, WatermarkSettings } from '../types'
import {
  closeImage,
  imageSize,
  loadImage,
  loadLogo,
  type DecodedImage,
} from '../lib/imageLoader'
import { computeOutputSize } from '../lib/sizing'
import { drawWatermarked } from '../lib/watermark'
import { useI18n } from '../i18n'
import { ImageIcon } from './icons'

const PREVIEW_MAX_EDGE = 1400

interface Props {
  item: ImageItem | undefined
  settings: WatermarkSettings
}

export function PreviewCanvas({ item, settings }: Props) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const baseRef = useRef<DecodedImage | null>(null)
  const baseSizeRef = useRef({ w: 0, h: 0 })
  const logoRef = useRef<{ image: DecodedImage; aspect: number } | null>(null)
  const [version, setVersion] = useState(0)
  const [loading, setLoading] = useState(false)

  // โหลดรูปตัวแทน (ย่อขนาดเพื่อ preview ให้ลื่น)
  useEffect(() => {
    let cancelled = false
    if (!item) {
      if (baseRef.current) closeImage(baseRef.current)
      baseRef.current = null
      setVersion((v) => v + 1)
      return
    }
    setLoading(true)
    loadImage(item.file)
      .then((bmp) => {
        if (cancelled) {
          closeImage(bmp)
          return
        }
        const { w, h } = imageSize(bmp)
        if (baseRef.current) closeImage(baseRef.current)
        baseRef.current = bmp
        baseSizeRef.current = computeOutputSize(w, h, PREVIEW_MAX_EDGE)
        setLoading(false)
        setVersion((v) => v + 1)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [item])

  // โหลดโลโก้สำหรับ preview
  useEffect(() => {
    let cancelled = false
    const { enabled, dataUrl } = settings.logo
    if (enabled && dataUrl) {
      loadLogo(dataUrl)
        .then((l) => {
          if (cancelled) {
            closeImage(l.image)
            return
          }
          if (logoRef.current) closeImage(logoRef.current.image)
          logoRef.current = l
          setVersion((v) => v + 1)
        })
        .catch(() => {})
    } else {
      if (logoRef.current) {
        closeImage(logoRef.current.image)
        logoRef.current = null
      }
      setVersion((v) => v + 1)
    }
    return () => {
      cancelled = true
    }
  }, [settings.logo.enabled, settings.logo.dataUrl])

  // วาด (debounce เล็กน้อยให้ลากสไลเดอร์ลื่น)
  useEffect(() => {
    const id = setTimeout(() => {
      const canvas = canvasRef.current
      const base = baseRef.current
      if (!canvas || !base) return
      const { w, h } = baseSizeRef.current
      if (w === 0) return
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      drawWatermarked({
        ctx,
        base,
        W: w,
        H: h,
        settings,
        logo: logoRef.current?.image ?? null,
        logoAspect: logoRef.current?.aspect ?? 1,
      })
    }, 90)
    return () => clearTimeout(id)
  }, [settings, version])

  // วาดซ้ำหลังฟอนต์โหลดเสร็จ (ข้อความไทย/ฟอนต์น่ารักวัดขนาดถูกต้อง)
  useEffect(() => {
    let cancelled = false
    document.fonts?.ready.then(() => {
      if (!cancelled) setVersion((v) => v + 1)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // cleanup
  useEffect(() => {
    return () => {
      if (baseRef.current) closeImage(baseRef.current)
      if (logoRef.current) closeImage(logoRef.current.image)
    }
  }, [])

  if (!item) {
    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-[1.5rem] border-2 border-dashed border-sakura-200 bg-white/50 text-lav-400">
        <ImageIcon className="h-10 w-10" />
        <span className="text-sm font-bold">{t.preview}</span>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border-2 border-sakura-100 bg-[conic-gradient(#f6eefc_0_25%,#fff_0_50%)] bg-[length:20px_20px] shadow-soft">
      <canvas ref={canvasRef} className="block h-auto w-full" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
          <span className="animate-bounce-soft text-2xl">💧</span>
        </div>
      )}
    </div>
  )
}
