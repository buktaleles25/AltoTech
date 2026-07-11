import { useEffect, useRef, useState } from 'react'
import type { BackgroundSettings, ImageItem, WatermarkSettings } from '../types'
import {
  closeImage,
  imageSize,
  loadImage,
  loadLogo,
  type DecodedImage,
} from '../lib/imageLoader'
import { computeOutputSize } from '../lib/sizing'
import { drawWatermarked, renderComposed } from '../lib/watermark'
import { removeBackground } from '../lib/bgRemoval'
import { useI18n } from '../i18n'
import { ImageIcon } from './icons'

const PREVIEW_MAX_EDGE = 1400

interface Props {
  item: ImageItem | undefined
  settings: WatermarkSettings
  background: BackgroundSettings
}

export function PreviewCanvas({ item, settings, background }: Props) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const baseRef = useRef<DecodedImage | null>(null)
  const baseSizeRef = useRef({ w: 0, h: 0 })
  const logoRef = useRef<{ image: DecodedImage; aspect: number } | null>(null)
  const cutoutRef = useRef<ImageBitmap | null>(null)
  const cutoutId = useRef<string | null>(null)
  const customBgRef = useRef<DecodedImage | null>(null)

  const [version, setVersion] = useState(0)
  const [baseTick, setBaseTick] = useState(0)
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(false)

  const bump = () => setVersion((v) => v + 1)

  // โหลดรูปตัวแทน (ย่อขนาด)
  useEffect(() => {
    let cancelled = false
    // เปลี่ยนรูป → cutout เดิมใช้ไม่ได้
    if (cutoutRef.current) {
      cutoutRef.current.close()
      cutoutRef.current = null
      cutoutId.current = null
    }
    if (!item) {
      if (baseRef.current) closeImage(baseRef.current)
      baseRef.current = null
      setBaseTick((v) => v + 1)
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
        setBaseTick((v) => v + 1)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [item])

  // โหลดโลโก้
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
          bump()
        })
        .catch(() => {})
    } else {
      if (logoRef.current) {
        closeImage(logoRef.current.image)
        logoRef.current = null
      }
      bump()
    }
    return () => {
      cancelled = true
    }
  }, [settings.logo.enabled, settings.logo.dataUrl])

  // โหลดพื้นหลัง custom
  useEffect(() => {
    let cancelled = false
    const fill = background.fill
    if (fill.type === 'custom') {
      loadLogo(fill.dataUrl)
        .then((l) => {
          if (cancelled) {
            closeImage(l.image)
            return
          }
          if (customBgRef.current) closeImage(customBgRef.current)
          customBgRef.current = l.image
          bump()
        })
        .catch(() => {})
    } else {
      if (customBgRef.current) {
        closeImage(customBgRef.current)
        customBgRef.current = null
      }
      bump()
    }
    return () => {
      cancelled = true
    }
  }, [background.fill])

  // ลบพื้นหลัง (AI) บนรูปตัวอย่าง — cache ไว้ต่อ item
  useEffect(() => {
    let cancelled = false
    if (!background.removeBg) {
      if (cutoutRef.current) {
        cutoutRef.current.close()
        cutoutRef.current = null
        cutoutId.current = null
      }
      setRemoving(false)
      bump()
      return
    }
    const base = baseRef.current
    if (!base || !item) return
    if (cutoutRef.current && cutoutId.current === item.id) return
    setRemoving(true)
    removeBackground(base)
      .then((cut) => {
        if (cancelled) {
          cut.close()
          return
        }
        if (cutoutRef.current) cutoutRef.current.close()
        cutoutRef.current = cut
        cutoutId.current = item.id
        setRemoving(false)
        bump()
      })
      .catch(() => {
        if (!cancelled) setRemoving(false)
      })
    return () => {
      cancelled = true
    }
  }, [background.removeBg, item, baseTick])

  // วาด (debounce)
  useEffect(() => {
    const id = setTimeout(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const logo = logoRef.current?.image ?? null
      const logoAspect = logoRef.current?.aspect ?? 1

      if (background.removeBg && cutoutRef.current) {
        const cut = cutoutRef.current
        canvas.width = cut.width
        canvas.height = cut.height
        renderComposed({
          ctx,
          W: cut.width,
          H: cut.height,
          mainImage: cut,
          bg: background.fill,
          customBgImage: customBgRef.current,
          settings,
          logo,
          logoAspect,
        })
      } else {
        const base = baseRef.current
        const { w, h } = baseSizeRef.current
        if (!base || w === 0) return
        canvas.width = w
        canvas.height = h
        drawWatermarked({ ctx, base, W: w, H: h, settings, logo, logoAspect })
      }
    }, 90)
    return () => clearTimeout(id)
  }, [settings, background, version, baseTick])

  // วาดซ้ำหลังฟอนต์โหลดเสร็จ
  useEffect(() => {
    let cancelled = false
    document.fonts?.ready.then(() => {
      if (!cancelled) bump()
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
      if (customBgRef.current) closeImage(customBgRef.current)
      if (cutoutRef.current) cutoutRef.current.close()
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

  const busy = loading || removing
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border-2 border-sakura-100 bg-[conic-gradient(#f6eefc_0_25%,#fff_0_50%)] bg-[length:20px_20px] shadow-soft">
      <canvas ref={canvasRef} className="block h-auto w-full" />
      {busy && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/65">
          <span className="animate-bounce-soft text-2xl">🐾</span>
          {removing && (
            <span className="text-xs font-bold text-sakura-500">{t.bgRemoving}</span>
          )}
        </div>
      )}
    </div>
  )
}
