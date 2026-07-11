import { useCallback, useRef, useState } from 'react'
import type {
  BackgroundSettings,
  ImageItem,
  OutputSettings,
  WatermarkSettings,
} from '../types'
import {
  closeImage,
  imageSize,
  loadImage,
  loadLogo,
  type DecodedImage,
} from '../lib/imageLoader'
import { computeOutputSize } from '../lib/sizing'
import { drawWatermarked, renderComposed } from '../lib/watermark'
import { buildFilename, canvasToBlob } from '../lib/encode'
import { preloadBgModel, removeBackground } from '../lib/bgRemoval'

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve())
    else setTimeout(resolve, 0)
  })
}

interface Args {
  images: ImageItem[]
  settings: WatermarkSettings
  output: OutputSettings
  background: BackgroundSettings
  updateImage: (id: string, patch: Partial<ImageItem>) => void
  onError?: (msg: string) => void
}

export function useProcessor({
  images,
  settings,
  output,
  background,
  updateImage,
  onError,
}: Args) {
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [stage, setStage] = useState('')
  const cancelRef = useRef(false)
  const runningRef = useRef(false)
  const cutoutCache = useRef<Map<string, ImageBitmap>>(new Map())

  const clearCutouts = useCallback(() => {
    cutoutCache.current.forEach((b) => {
      try {
        b.close()
      } catch {
        /* ignore */
      }
    })
    cutoutCache.current.clear()
  }, [])

  const run = useCallback(async () => {
    if (runningRef.current) return
    const targets = images
    if (targets.length === 0) return

    runningRef.current = true
    cancelRef.current = false
    setProcessing(true)
    setProgress({ done: 0, total: targets.length })

    try {
      await document.fonts?.ready
    } catch {
      /* ignore */
    }

    // ลบ cutout ของรูปที่ถูกเอาออกไปแล้ว
    const ids = new Set(targets.map((t) => t.id))
    cutoutCache.current.forEach((b, id) => {
      if (!ids.has(id)) {
        try {
          b.close()
        } catch {
          /* ignore */
        }
        cutoutCache.current.delete(id)
      }
    })

    // โหลดโมเดล AI ล่วงหน้า (ถ้าเปิดลบพื้นหลัง)
    if (background.removeBg) {
      try {
        setStage('กำลังโหลดโมเดล AI…')
        await preloadBgModel((pct) => setStage(`กำลังโหลดโมเดล AI… ${Math.round(pct)}%`))
      } catch (e) {
        setStage('')
        setProcessing(false)
        runningRef.current = false
        onError?.(e instanceof Error ? e.message : 'โหลดโมเดล AI ไม่สำเร็จ')
        return
      }
    }
    setStage('')

    // เตรียมโลโก้ + พื้นหลัง custom ครั้งเดียว
    let logo: DecodedImage | null = null
    let logoAspect = 1
    if (settings.logo.enabled && settings.logo.dataUrl) {
      try {
        const l = await loadLogo(settings.logo.dataUrl)
        logo = l.image
        logoAspect = l.aspect
      } catch {
        logo = null
      }
    }
    let customBg: DecodedImage | null = null
    if (background.removeBg && background.fill.type === 'custom') {
      try {
        customBg = (await loadLogo(background.fill.dataUrl)).image
      } catch {
        customBg = null
      }
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    for (let i = 0; i < targets.length; i++) {
      if (cancelRef.current) break
      const item = targets[i]
      updateImage(item.id, { status: 'processing', error: undefined })
      let bitmap: DecodedImage | null = null
      try {
        if (!ctx) throw new Error('เบราว์เซอร์ไม่รองรับ canvas')

        let mainImage: CanvasImageSource
        let mw: number
        let mh: number
        let composed = false

        if (background.removeBg) {
          let cutout = cutoutCache.current.get(item.id)
          if (!cutout) {
            setStage(`กำลังลบพื้นหลัง ${i + 1}/${targets.length}…`)
            bitmap = await loadImage(item.file)
            cutout = await removeBackground(bitmap)
            cutoutCache.current.set(item.id, cutout)
            setStage('')
          }
          mainImage = cutout
          mw = cutout.width
          mh = cutout.height
          composed = true
        } else {
          bitmap = await loadImage(item.file)
          const s = imageSize(bitmap)
          mainImage = bitmap
          mw = s.w
          mh = s.h
        }

        const size = computeOutputSize(mw, mh, output.maxEdge)
        canvas.width = size.w
        canvas.height = size.h

        if (composed) {
          renderComposed({
            ctx,
            W: size.w,
            H: size.h,
            mainImage,
            bg: background.fill,
            customBgImage: customBg,
            settings,
            logo,
            logoAspect,
          })
        } else {
          drawWatermarked({ ctx, base: mainImage, W: size.w, H: size.h, settings, logo, logoAspect })
        }
        if (bitmap) closeImage(bitmap)
        bitmap = null

        // โปร่งใส → บังคับ PNG (เก็บ alpha)
        const transparent = background.removeBg && background.fill.type === 'transparent'
        const fmt = transparent ? 'image/png' : output.format
        const blob = await canvasToBlob(canvas, fmt, output.quality)
        const resultName = buildFilename(item.name, output.filenamePrefix, fmt)
        const resultUrl = URL.createObjectURL(blob)
        updateImage(item.id, { status: 'done', resultBlob: blob, resultUrl, resultName })
      } catch (err) {
        if (bitmap) closeImage(bitmap)
        updateImage(item.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'ทำไม่สำเร็จ',
        })
      }
      setProgress({ done: i + 1, total: targets.length })
      await nextFrame()
    }

    if (logo) closeImage(logo)
    if (customBg) closeImage(customBg)
    canvas.width = 0
    canvas.height = 0

    setStage('')
    setProcessing(false)
    runningRef.current = false
  }, [images, settings, output, background, updateImage, onError])

  const cancel = useCallback(() => {
    cancelRef.current = true
  }, [])

  return { processing, progress, stage, run, cancel, clearCutouts }
}
