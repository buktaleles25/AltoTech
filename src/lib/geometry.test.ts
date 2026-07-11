import { describe, expect, it } from 'vitest'
import { anchorPoint, deg2rad, rotatedHalfExtent, tilePositions } from './geometry'

describe('deg2rad', () => {
  it('แปลงองศาเป็นเรเดียน', () => {
    expect(deg2rad(180)).toBeCloseTo(Math.PI)
    expect(deg2rad(0)).toBe(0)
  })
})

describe('rotatedHalfExtent', () => {
  it('ที่ 0 องศา = ครึ่งขนาดเดิม', () => {
    const { halfW, halfH } = rotatedHalfExtent(100, 40, 0)
    expect(halfW).toBeCloseTo(50)
    expect(halfH).toBeCloseTo(20)
  })

  it('ที่ 90 องศา สลับกว้าง/สูง', () => {
    const { halfW, halfH } = rotatedHalfExtent(100, 40, deg2rad(90))
    expect(halfW).toBeCloseTo(20)
    expect(halfH).toBeCloseTo(50)
  })

  it('ที่ 45 องศา ขยายกล่องครอบ', () => {
    const { halfW, halfH } = rotatedHalfExtent(100, 100, deg2rad(45))
    expect(halfW).toBeGreaterThan(50)
    expect(halfH).toBeGreaterThan(50)
  })
})

describe('anchorPoint', () => {
  const W = 1000
  const H = 800
  const margin = 20
  const halfW = 50
  const halfH = 15

  it('top-left เผื่อขอบ + ครึ่งขนาด', () => {
    expect(anchorPoint('top-left', W, H, halfW, halfH, margin)).toEqual({
      x: margin + halfW,
      y: margin + halfH,
    })
  })

  it('bottom-right ชิดมุมขวาล่าง', () => {
    expect(anchorPoint('bottom-right', W, H, halfW, halfH, margin)).toEqual({
      x: W - margin - halfW,
      y: H - margin - halfH,
    })
  })

  it('center อยู่กลางรูปพอดี', () => {
    expect(anchorPoint('center', W, H, halfW, halfH, margin)).toEqual({
      x: W / 2,
      y: H / 2,
    })
  })

  it('top-center = กลางแนวนอน ชิดบน', () => {
    expect(anchorPoint('top-center', W, H, halfW, halfH, margin)).toEqual({
      x: W / 2,
      y: margin + halfH,
    })
  })

  it('center-left = ชิดซ้าย กลางแนวตั้ง', () => {
    expect(anchorPoint('center-left', W, H, halfW, halfH, margin)).toEqual({
      x: margin + halfW,
      y: H / 2,
    })
  })
})

describe('tilePositions', () => {
  it('คืนจุดที่คลุมพื้นที่ (ไม่ว่าง)', () => {
    const pts = tilePositions(1000, 800, 200, 120)
    expect(pts.length).toBeGreaterThan(0)
  })

  it('ครอบคลุมทั้งด้านบวกและลบของทั้งสองแกน (คลุมมุมหลังหมุน)', () => {
    const pts = tilePositions(1000, 800, 200, 120)
    expect(pts.some((p) => p.x < 0)).toBe(true)
    expect(pts.some((p) => p.x > 0)).toBe(true)
    expect(pts.some((p) => p.y < 0)).toBe(true)
    expect(pts.some((p) => p.y > 0)).toBe(true)
  })

  it('กัน step = 0 ไม่ให้ loop ค้าง', () => {
    const pts = tilePositions(100, 100, 0, 0)
    expect(pts.length).toBeGreaterThan(0)
    expect(Number.isFinite(pts.length)).toBe(true)
  })
})
