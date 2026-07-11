export interface Size {
  w: number
  h: number
}

// เพดานพื้นที่ canvas ที่ปลอดภัยบนมือถือ/iOS เก่า (~16 ล้านพิกเซล)
// กัน tab crash เวลาเจอรูปความละเอียดสูงมาก
export const DEFAULT_MAX_AREA = 16_000_000

/**
 * คำนวณขนาดผลลัพธ์ โดย
 * 1) จำกัดด้านยาวสุดไม่เกิน maxEdge (ถ้ากำหนด)
 * 2) จำกัดพื้นที่รวมไม่เกิน maxArea
 * 3) ไม่ขยายรูปให้ใหญ่กว่าเดิม (scale <= 1)
 */
export function computeOutputSize(
  w: number,
  h: number,
  maxEdge: number | null,
  maxArea: number = DEFAULT_MAX_AREA,
): Size {
  let scale = 1

  if (maxEdge && maxEdge > 0) {
    const longest = Math.max(w, h)
    if (longest > maxEdge) {
      scale = Math.min(scale, maxEdge / longest)
    }
  }

  if (w * h * scale * scale > maxArea) {
    scale = Math.sqrt(maxArea / (w * h))
  }

  scale = Math.min(scale, 1)

  return {
    w: Math.max(1, Math.round(w * scale)),
    h: Math.max(1, Math.round(h * scale)),
  }
}
