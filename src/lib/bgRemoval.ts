import { imageSize, type DecodedImage } from './imageLoader'

// จำกัดขนาดรูปที่ส่งเข้าโมเดล (BiRefNet ประมวลผลภายในที่ ~1024 อยู่แล้ว)
// 2048 = คมพอสำหรับใช้งานทั่วไป + ประหยัด memory/เวลาบนมือถือ
const BG_MAX_EDGE = 2048

type Pending = { resolve: (v: RemoveResult) => void; reject: (e: Error) => void }
interface RemoveResult {
  data: ArrayBuffer
  width: number
  height: number
}

let worker: Worker | null = null
let seq = 0
const pending = new Map<number, Pending>()
let progressCb: ((pct: number) => void) | null = null
let readyResolve: (() => void) | null = null
let readyReject: ((e: Error) => void) | null = null
let readyPromise: Promise<void> | null = null

function toPct(progress: unknown): number {
  if (typeof progress === 'number') return progress
  const p = progress as { progress?: number; loaded?: number; total?: number } | null
  if (p && typeof p.progress === 'number') return p.progress
  if (p && p.loaded && p.total) return (p.loaded / p.total) * 100
  return 0
}

function handleMessage(e: MessageEvent) {
  const m = e.data
  switch (m.type) {
    case 'progress':
      progressCb?.(toPct(m.progress))
      break
    case 'ready':
      readyResolve?.()
      readyResolve = null
      readyReject = null
      break
    case 'result': {
      const p = pending.get(m.id)
      if (p) {
        pending.delete(m.id)
        p.resolve({ data: m.data, width: m.width, height: m.height })
      }
      break
    }
    case 'error': {
      const err = new Error(m.message || 'ลบพื้นหลังไม่สำเร็จ')
      const p = m.id != null ? pending.get(m.id) : null
      if (p) {
        pending.delete(m.id)
        p.reject(err)
      } else {
        readyReject?.(err)
        readyReject = null
        readyResolve = null
      }
      break
    }
  }
}

function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/bgRemoval.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = handleMessage
    worker.onerror = () => {
      const err = new Error('ตัวประมวลผล AI มีปัญหา')
      pending.forEach((p) => p.reject(err))
      pending.clear()
      readyReject?.(err)
      readyReject = null
      readyResolve = null
      readyPromise = null
    }
  }
  return worker
}

/** โหลดโมเดลล่วงหน้า (ครั้งแรกครั้งเดียว) — คืน promise ที่ resolve เมื่อพร้อม */
export function preloadBgModel(onProgress?: (pct: number) => void): Promise<void> {
  if (onProgress) progressCb = onProgress
  if (!readyPromise) {
    readyPromise = new Promise<void>((resolve, reject) => {
      readyResolve = resolve
      readyReject = reject
    })
    ensureWorker().postMessage({ type: 'init' })
  }
  return readyPromise
}

/** ลบพื้นหลังรูป → คืน ImageBitmap ที่พื้นหลังโปร่งใส (ตัวแบบเท่านั้น) */
export async function removeBackground(
  source: DecodedImage,
  onProgress?: (pct: number) => void,
): Promise<ImageBitmap> {
  if (onProgress) progressCb = onProgress
  await preloadBgModel(onProgress)

  const { w, h } = imageSize(source)
  const scale = Math.min(1, BG_MAX_EDGE / Math.max(w, h))
  const cw = Math.max(1, Math.round(w * scale))
  const ch = Math.max(1, Math.round(h * scale))

  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('สร้าง canvas ไม่ได้')
  ctx.drawImage(source, 0, 0, cw, ch)
  const imgData = ctx.getImageData(0, 0, cw, ch)

  const id = ++seq
  const result = await new Promise<RemoveResult>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    const buf = imgData.data.buffer
    ensureWorker().postMessage({ type: 'remove', id, data: buf, width: cw, height: ch }, [buf])
  })

  const out = new ImageData(new Uint8ClampedArray(result.data), result.width, result.height)
  return await createImageBitmap(out)
}

/** มี WebGPU ไหม (ใช้บอกผู้ใช้เรื่องความเร็ว) */
export function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}
