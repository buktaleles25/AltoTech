export type DecodedImage = ImageBitmap | HTMLImageElement

/**
 * โหลดไฟล์รูปเป็นภาพที่วาดลง canvas ได้ พร้อมแก้การหมุนตาม EXIF
 * (รูปแนวตั้งจาก iPhone จะไม่ตะแคง)
 * ลำดับ fallback: createImageBitmap+orientation -> createImageBitmap -> <img>
 */
export async function loadImage(file: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      try {
        return await createImageBitmap(file)
      } catch {
        // ตกไปใช้ <img>
      }
    }
  }
  return await loadHtmlImage(file)
}

function loadHtmlImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('โหลดรูปไม่สำเร็จ (ไฟล์อาจไม่รองรับ เช่น HEIC บนเบราว์เซอร์นี้)'))
    }
    img.src = url
  })
}

export function imageSize(src: DecodedImage): { w: number; h: number } {
  if ('naturalWidth' in src) {
    return { w: src.naturalWidth, h: src.naturalHeight }
  }
  return { w: src.width, h: src.height }
}

export function closeImage(src: DecodedImage): void {
  if ('close' in src) src.close()
}

/** โหลดโลโก้จาก data URL เป็นภาพ พร้อมคำนวณอัตราส่วน (h/w) */
export async function loadLogo(
  dataUrl: string,
): Promise<{ image: DecodedImage; aspect: number }> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const image = await loadImage(blob)
  const { w, h } = imageSize(image)
  return { image, aspect: h / w }
}
