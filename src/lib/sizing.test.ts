import { describe, expect, it } from 'vitest'
import { computeOutputSize, DEFAULT_MAX_AREA } from './sizing'

describe('computeOutputSize', () => {
  it('ไม่มีข้อจำกัด + รูปเล็ก = ขนาดเดิม', () => {
    expect(computeOutputSize(800, 600, null, DEFAULT_MAX_AREA)).toEqual({ w: 800, h: 600 })
  })

  it('ไม่ขยายรูปให้ใหญ่กว่าเดิม', () => {
    expect(computeOutputSize(400, 300, 4000, DEFAULT_MAX_AREA)).toEqual({ w: 400, h: 300 })
  })

  it('จำกัดด้านยาวสุดตาม maxEdge (คงอัตราส่วน)', () => {
    const out = computeOutputSize(4000, 2000, 2000, DEFAULT_MAX_AREA)
    expect(Math.max(out.w, out.h)).toBe(2000)
    expect(out.w / out.h).toBeCloseTo(2, 5)
  })

  it('จำกัดพื้นที่รวมไม่เกิน maxArea', () => {
    const maxArea = 1_000_000
    const out = computeOutputSize(6000, 4000, null, maxArea)
    expect(out.w * out.h).toBeLessThanOrEqual(maxArea + 2000) // เผื่อปัดเศษ
    expect(out.w / out.h).toBeCloseTo(1.5, 1) // คงอัตราส่วน (คลาดเคลื่อนเล็กน้อยจากการปัดเป็นจำนวนเต็ม)
  })

  it('เพดานพื้นที่ default กันรูปยักษ์', () => {
    const out = computeOutputSize(12000, 9000, null)
    expect(out.w * out.h).toBeLessThanOrEqual(DEFAULT_MAX_AREA + 5000)
  })

  it('ผลลัพธ์เป็นจำนวนเต็มอย่างน้อย 1', () => {
    const out = computeOutputSize(1, 1, 10)
    expect(Number.isInteger(out.w)).toBe(true)
    expect(out.w).toBeGreaterThanOrEqual(1)
  })
})
