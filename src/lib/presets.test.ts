import { describe, expect, it } from 'vitest'
import { drawPreset, getPreset, PRESETS } from './presets'

// mock 2D context — บันทึกจำนวนครั้งที่เติมสี
function mockCtx() {
  const calls = { fill: 0, fillRect: 0 }
  const grad = { addColorStop: () => {} }
  return {
    calls,
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    fillStyle: '',
    fillRect: () => {
      calls.fillRect++
    },
    beginPath: () => {},
    arc: () => {},
    moveTo: () => {},
    lineTo: () => {},
    bezierCurveTo: () => {},
    closePath: () => {},
    fill: () => {
      calls.fill++
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('presets', () => {
  it('มีทั้งหมวด pastel และ studio', () => {
    expect(PRESETS.some((p) => p.category === 'pastel')).toBe(true)
    expect(PRESETS.some((p) => p.category === 'studio')).toBe(true)
  })

  it('id ไม่ซ้ำกัน', () => {
    const ids = PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ทุก preset วาดได้ไม่ error และมีการเติมสีจริง', () => {
    for (const p of PRESETS) {
      const ctx = mockCtx()
      expect(() => p.draw(ctx, 240, 180)).not.toThrow()
      expect(ctx.calls.fill + ctx.calls.fillRect).toBeGreaterThan(0)
    }
  })

  it('deterministic — วาดสองครั้งได้จำนวน fill เท่ากัน', () => {
    const hearts = getPreset('p-hearts')!
    const a = mockCtx()
    const b = mockCtx()
    hearts.draw(a, 300, 200)
    hearts.draw(b, 300, 200)
    expect(a.calls.fill).toBe(b.calls.fill)
  })

  it('drawPreset/getPreset จัดการ id ถูกต้อง', () => {
    expect(drawPreset(mockCtx(), 10, 10, 'nope')).toBe(false)
    expect(drawPreset(mockCtx(), 10, 10, PRESETS[0].id)).toBe(true)
    expect(getPreset(PRESETS[0].id)?.id).toBe(PRESETS[0].id)
    expect(getPreset('nope')).toBeUndefined()
  })
})
