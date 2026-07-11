import { useCallback, useEffect, useRef, useState } from 'react'
import type { ImageItem } from '../types'

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `img_${Math.random().toString(36).slice(2)}_${Date.now()}`
}

function revoke(url?: string) {
  if (url) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }
}

export function useImages() {
  const [images, setImages] = useState<ImageItem[]>([])

  // เก็บ ref ล่าสุดไว้เพื่อ revoke ตอน unmount
  const imagesRef = useRef<ImageItem[]>(images)
  imagesRef.current = images

  useEffect(() => {
    return () => {
      for (const img of imagesRef.current) {
        revoke(img.thumbUrl)
        revoke(img.resultUrl)
      }
    }
  }, [])

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (list.length === 0) return
    const items: ImageItem[] = list.map((file) => ({
      id: makeId(),
      file,
      name: file.name || 'image.jpg',
      thumbUrl: URL.createObjectURL(file),
      status: 'pending',
    }))
    setImages((prev) => [...prev, ...items])
  }, [])

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id)
      revoke(target?.thumbUrl)
      revoke(target?.resultUrl)
      return prev.filter((i) => i.id !== id)
    })
  }, [])

  const clearAll = useCallback(() => {
    setImages((prev) => {
      for (const img of prev) {
        revoke(img.thumbUrl)
        revoke(img.resultUrl)
      }
      return []
    })
  }, [])

  // อัปเดตทีละรูป — ถ้ามี resultUrl เก่าและกำลังใส่อันใหม่ ให้ revoke อันเก่า
  const updateImage = useCallback((id: string, patch: Partial<ImageItem>) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id !== id) return img
        if (patch.resultUrl && img.resultUrl && patch.resultUrl !== img.resultUrl) {
          revoke(img.resultUrl)
        }
        return { ...img, ...patch }
      }),
    )
  }, [])

  return { images, addFiles, removeImage, clearAll, updateImage }
}
