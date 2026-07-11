export type ShareResult = 'shared' | 'unsupported' | 'cancelled' | 'error'

/** ตรวจว่าอุปกรณ์แชร์ไฟล์รูปผ่าน Web Share ได้ไหม (สำคัญบน iOS = เซฟเข้า Photos) */
export function canShareFiles(files: File[]): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files })
  )
}

/** ตรวจความสามารถแชร์ไฟล์แบบเร็ว (ใช้ไฟล์จำลอง ไม่ต้องสร้างไฟล์จริงทั้งหมด) */
export function supportsFileShare(): boolean {
  try {
    const probe = new File(['x'], 'probe.png', { type: 'image/png' })
    return canShareFiles([probe])
  } catch {
    return false
  }
}

export function blobToFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type || 'image/jpeg' })
}

/**
 * แชร์ไฟล์ผ่าน share sheet ของระบบ
 * ต้องเรียกภายใน user gesture (การแตะ) และไฟล์ต้องพร้อมแล้ว (อย่ามีงานหนักคั่น)
 */
export async function shareFiles(files: File[], title: string): Promise<ShareResult> {
  if (!canShareFiles(files)) return 'unsupported'
  try {
    await navigator.share({ files, title })
    return 'shared'
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
    return 'error'
  }
}

/** ดาวน์โหลด blob เป็นไฟล์เดียว (ใช้ได้บน desktop/Android; iOS เซฟลง Files) */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/** ตรวจว่าเป็น iOS (iPhone/iPad รวม iPad ที่รายงานตัวเป็น Mac) */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return (
    /iP(hone|ad|od)/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}
