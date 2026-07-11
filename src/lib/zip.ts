import { zip as fflateZip } from 'fflate'

export interface ZipEntry {
  name: string
  blob: Blob
}

/** ตั้งชื่อไม่ให้ซ้ำกันภายใน zip (เติม -2, -3 ...) */
function uniqueName(name: string, used: Map<string, number>): string {
  const count = used.get(name)
  if (count === undefined) {
    used.set(name, 1)
    return name
  }
  const next = count + 1
  used.set(name, next)
  const dot = name.lastIndexOf('.')
  return dot >= 0
    ? `${name.slice(0, dot)}-${next}${name.slice(dot)}`
    : `${name}-${next}`
}

/**
 * รวมรูปหลายไฟล์เป็น .zip เดียว (โหมด STORE ไม่บีบอัดซ้ำ เพราะรูป compress อยู่แล้ว)
 * ใช้ fflate แบบ async (ไม่บล็อก main thread)
 */
export async function zipImages(entries: ZipEntry[]): Promise<Blob> {
  const used = new Map<string, number>()
  const files: Record<string, Uint8Array> = {}

  for (const entry of entries) {
    const name = uniqueName(entry.name, used)
    files[name] = new Uint8Array(await entry.blob.arrayBuffer())
  }

  return await new Promise<Blob>((resolve, reject) => {
    fflateZip(files, { level: 0 }, (err, data) => {
      if (err) reject(err)
      else resolve(new Blob([data as BlobPart], { type: 'application/zip' }))
    })
  })
}
