import type { Anchor } from '../types'

export interface Point {
  x: number
  y: number
}

export function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * ครึ่งหนึ่งของกล่องครอบ (axis-aligned) หลังหมุนกล่องขนาด bw x bh ไปมุม theta (เรเดียน)
 * ใช้เพื่อวางลายน้ำให้ไม่ล้นขอบเมื่อมีการหมุน
 */
export function rotatedHalfExtent(
  bw: number,
  bh: number,
  theta: number,
): { halfW: number; halfH: number } {
  const c = Math.abs(Math.cos(theta))
  const s = Math.abs(Math.sin(theta))
  return {
    halfW: (bw * c + bh * s) / 2,
    halfH: (bw * s + bh * c) / 2,
  }
}

/**
 * จุดศูนย์กลางที่จะวางลายน้ำตาม anchor บน canvas ขนาด W x H
 * โดยเผื่อ margin และครึ่งขนาดของลายน้ำ (หลังหมุน) ไว้แล้ว
 */
export function anchorPoint(
  anchor: Anchor,
  W: number,
  H: number,
  halfW: number,
  halfH: number,
  margin: number,
): Point {
  let x: number
  let y: number

  if (anchor.includes('left')) x = margin + halfW
  else if (anchor.includes('right')) x = W - margin - halfW
  else x = W / 2

  if (anchor.includes('top')) y = margin + halfH
  else if (anchor.includes('bottom')) y = H - margin - halfH
  else y = H / 2

  return { x, y }
}

/**
 * รายการจุด (ในระบบพิกัดที่ origin อยู่กลางรูปและหมุนแล้ว) สำหรับปูลายน้ำแบบ tile
 * วน grid คลุมพื้นที่กว้างกว่าเส้นทแยงมุม เพื่อไม่ให้มีช่องว่างที่มุมหลังหมุน field
 * แถวคู่/คี่เยื้องแบบ brick เพื่อความสวยงาม
 */
export function tilePositions(W: number, H: number, stepX: number, stepY: number): Point[] {
  const sx = Math.max(stepX, 1)
  const sy = Math.max(stepY, 1)
  const R = Math.hypot(W, H) / 2 + Math.max(sx, sy)
  const pts: Point[] = []
  let row = 0
  for (let y = -R; y <= R; y += sy) {
    const brick = row % 2 === 0 ? 0 : sx / 2
    for (let x = -R; x <= R; x += sx) {
      pts.push({ x: x + brick, y })
    }
    row++
  }
  return pts
}
