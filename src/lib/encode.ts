import type { OutputFormat } from '../types'

/** แปลง canvas เป็น Blob (รองรับทั้ง HTMLCanvasElement และ OffscreenCanvas) */
export async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  format: OutputFormat,
  quality: number,
): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return await canvas.convertToBlob({ type: format, quality })
  }
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('แปลงรูปไม่สำเร็จ'))),
      format,
      quality,
    )
  })
}

/** ตั้งชื่อไฟล์ผลลัพธ์ เช่น "myphoto" -> "prefix_myphoto_wm.jpg" */
export function buildFilename(
  originalName: string,
  prefix: string,
  format: OutputFormat,
): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'image'
  const ext = format === 'image/png' ? 'png' : 'jpg'
  const pre = prefix.trim()
  return `${pre ? pre : ''}${base}_wm.${ext}`
}
