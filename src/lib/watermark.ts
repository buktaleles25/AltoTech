import type { WatermarkSettings } from '../types'
import { anchorPoint, deg2rad, rotatedHalfExtent, tilePositions } from './geometry'

// context ที่ใช้วาดได้ทั้ง <canvas> ปกติ และ OffscreenCanvas
export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export interface DrawInput {
  ctx: Ctx2D
  base: CanvasImageSource
  W: number
  H: number
  settings: WatermarkSettings
  logo?: CanvasImageSource | null
  logoAspect?: number // ความสูง/ความกว้าง ของโลโก้
}

interface Stamp {
  cw: number // ความกว้างรวมของ stamp
  ch: number // ความสูงรวมของ stamp
  paint: (ctx: Ctx2D) => void // วาด stamp โดยจัดกึ่งกลางที่ origin (ยังไม่หมุน)
}

/**
 * ประกอบ "ตราลายน้ำ" (stamp) = โลโก้ (บน) + ข้อความ (ล่าง) วางซ้อนแนวตั้งจัดกึ่งกลาง
 * คืน null ถ้าไม่มีอะไรจะวาด
 */
function buildStamp(
  ctx: Ctx2D,
  S: number,
  settings: WatermarkSettings,
  logo: CanvasImageSource | null | undefined,
  logoAspect: number,
): Stamp | null {
  const t = settings.text
  const hasLogo = !!(settings.logo.enabled && logo)
  const hasText = !!(t.enabled && t.text.trim().length > 0)
  if (!hasLogo && !hasText) return null

  const gapBetween = hasLogo && hasText ? S * 0.02 : 0

  // ---- โลโก้ ----
  let logoW = 0
  let logoH = 0
  if (hasLogo) {
    logoW = (settings.logo.sizePct / 100) * S
    logoH = logoW * (logoAspect || 1)
  }

  // ---- ข้อความ ----
  let textW = 0
  let textH = 0
  let fontPx = 0
  if (hasText) {
    fontPx = (t.sizePct / 100) * S
    ctx.font = `700 ${fontPx}px ${t.fontFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const m = ctx.measureText(t.text)
    textW = m.width
    const asc = m.actualBoundingBoxAscent || fontPx * 0.8
    const desc = m.actualBoundingBoxDescent || fontPx * 0.2
    textH = asc + desc
  }

  const cw = Math.max(logoW, textW)
  const ch = logoH + gapBetween + textH

  const paint = (c: Ctx2D) => {
    let top = -ch / 2

    if (hasLogo && logo) {
      const cy = top + logoH / 2
      c.save()
      c.globalAlpha = settings.logo.opacity
      c.drawImage(logo, -logoW / 2, cy - logoH / 2, logoW, logoH)
      c.restore()
      top += logoH + gapBetween
    }

    if (hasText) {
      const cy = top + textH / 2
      c.save()
      c.globalAlpha = t.opacity
      c.font = `700 ${fontPx}px ${t.fontFamily}`
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      if (t.outline) {
        c.lineWidth = Math.max(1, fontPx * 0.06)
        c.strokeStyle = t.outlineColor
        c.lineJoin = 'round'
        c.miterLimit = 2
        c.strokeText(t.text, 0, cy)
      }
      c.fillStyle = t.color
      c.fillText(t.text, 0, cy)
      c.restore()
    }
  }

  return { cw, ch, paint }
}

/**
 * วาดรูปต้นฉบับ + ลายน้ำ ลงบน ctx (ขนาด W x H) — หัวใจของแอพ
 * ใช้ตัวเดียวกันทั้ง live preview และตอนประมวลผล batch จริง
 */
export function drawWatermarked(input: DrawInput): void {
  const { ctx, base, W, H, settings, logo, logoAspect = 1 } = input

  ctx.clearRect(0, 0, W, H)
  ctx.drawImage(base, 0, 0, W, H)

  const S = Math.min(W, H)
  const stamp = buildStamp(ctx, S, settings, logo, logoAspect)
  if (!stamp) return

  const theta = deg2rad(settings.rotationDeg)

  if (settings.anchor === 'tile') {
    const gapPx = (settings.tileGapPct / 100) * S
    const stepX = stamp.cw + gapPx + S * 0.04
    const stepY = stamp.ch + gapPx + S * 0.04
    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.rotate(theta)
    for (const p of tilePositions(W, H, stepX, stepY)) {
      ctx.save()
      ctx.translate(p.x, p.y)
      stamp.paint(ctx)
      ctx.restore()
    }
    ctx.restore()
  } else {
    const marginPx = (settings.marginPct / 100) * S
    const { halfW, halfH } = rotatedHalfExtent(stamp.cw, stamp.ch, theta)
    const c = anchorPoint(settings.anchor, W, H, halfW, halfH, marginPx)
    ctx.save()
    ctx.translate(c.x, c.y)
    ctx.rotate(theta)
    stamp.paint(ctx)
    ctx.restore()
  }
}
