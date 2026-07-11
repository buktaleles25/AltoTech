import { useCallback, useRef, useState } from 'react'
import type { ImageItem, OutputSettings, WatermarkSettings } from '../types'
import {
  closeImage,
  imageSize,
  loadImage,
  loadLogo,
  type DecodedImage,
} from '../lib/imageLoader'
import { computeOutputSize } from '../lib/sizing'
import { drawWatermarked } from '../lib/watermark'
import { buildFilename, canvasToBlob } from '../lib/encode'

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
  updateImage: (id: string, patch: Partial<ImageItem>) => void
}

export function useProcessor({ images, settings, output, updateImage }: Args) {
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const cancelRef = useRef(false)
  const runningRef = useRef(false)

  const run = useCallback(async () => {
    if (runningRef.current) return
    const targets = images
    if (targets.length === 0) return

    runningRef.current = true
    cancelRef.current = false
    setProcessing(true)
    setProgress({ done: 0, total: targets.length })

    // รอฟอนต์โหลดเสร็จก่อน (สำคัญกับข้อความไทย/ฟอนต์น่ารัก)
    try {
      await document.fonts?.ready
    } catch {
      // ignore
    }

    // เตรียมโลโก้ครั้งเดียว (ใช้ซ้ำทุกรูป)
    let logo: DecodedImage | null = null
    let logoAspect = 1
    if (settings.logo.enabled && settings.logo.dataUrl) {
      try {
        const loaded = await loadLogo(settings.logo.dataUrl)
        logo = loaded.image
        logoAspect = loaded.aspect
      } catch {
        logo = null
      }
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    for (let i = 0; i < targets.length; i++) {
      if (cancelRef.current) break
      const item = targets[i]
      updateImage(item.id, { status: 'processing', error: undefined })
      try {
        if (!ctx) throw new Error('เบราว์เซอร์ไม่รองรับ canvas')
        const bitmap = await loadImage(item.file)
        const { w, h } = imageSize(bitmap)
        const size = computeOutputSize(w, h, output.maxEdge)
        canvas.width = size.w
        canvas.height = size.h
        drawWatermarked({
          ctx,
          base: bitmap,
          W: size.w,
          H: size.h,
          settings,
          logo,
          logoAspect,
        })
        closeImage(bitmap)
        const blob = await canvasToBlob(canvas, output.format, output.quality)
        const resultName = buildFilename(item.name, output.filenamePrefix, output.format)
        const resultUrl = URL.createObjectURL(blob)
        updateImage(item.id, {
          status: 'done',
          resultBlob: blob,
          resultUrl,
          resultName,
        })
      } catch (err) {
        updateImage(item.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'ทำไม่สำเร็จ',
        })
      }
      setProgress({ done: i + 1, total: targets.length })
      await nextFrame() // yield ให้ UI อัปเดต progress + ไม่ค้าง
    }

    if (logo) closeImage(logo)
    canvas.width = 0
    canvas.height = 0

    setProcessing(false)
    runningRef.current = false
  }, [images, settings, output, updateImage])

  const cancel = useCallback(() => {
    cancelRef.current = true
  }, [])

  return { processing, progress, run, cancel }
}
