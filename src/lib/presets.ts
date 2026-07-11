// ชุดพื้นหลังสำเร็จรูป — วาดด้วย canvas (ปรับตามอัตราส่วนรูปได้ ไม่ต้องมีไฟล์ asset)
// ทุก preset วาดแบบ deterministic (ใช้ seed คงที่) เพื่อให้ preview ตรงกับผลจริงเสมอ

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export type PresetCategory = 'pastel' | 'studio'

export interface Preset {
  id: string
  name: string
  category: PresetCategory
  draw: (ctx: Ctx, W: number, H: number) => void
}

// ---- helpers ----
function mulberry32(seed: number) {
  let s = seed
  return function () {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function linearGrad(ctx: Ctx, W: number, H: number, colors: string[], diagonal = true) {
  const g = diagonal
    ? ctx.createLinearGradient(0, 0, W, H)
    : ctx.createLinearGradient(0, 0, 0, H)
  colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

function radialGrad(ctx: Ctx, W: number, H: number, inner: string, outer: string, cy = 0.42) {
  const g = ctx.createRadialGradient(
    W / 2,
    H * cy,
    Math.min(W, H) * 0.05,
    W / 2,
    H * cy,
    Math.hypot(W, H) * 0.7,
  )
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

function heartPath(ctx: Ctx, x: number, y: number, s: number) {
  ctx.beginPath()
  ctx.moveTo(x, y + s * 0.3)
  ctx.bezierCurveTo(x, y, x - s, y - s * 0.1, x - s, y + s * 0.35)
  ctx.bezierCurveTo(x - s, y + s * 0.75, x - s * 0.4, y + s, x, y + s * 1.25)
  ctx.bezierCurveTo(x + s * 0.4, y + s, x + s, y + s * 0.75, x + s, y + s * 0.35)
  ctx.bezierCurveTo(x + s, y - s * 0.1, x, y, x, y + s * 0.3)
  ctx.closePath()
  ctx.fill()
}

function starPath(ctx: Ctx, x: number, y: number, s: number) {
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI / 2) * 3 + (i * 2 * Math.PI) / 5
    ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s)
    const a2 = a + Math.PI / 5
    ctx.lineTo(x + Math.cos(a2) * s * 0.45, y + Math.sin(a2) * s * 0.45)
  }
  ctx.closePath()
  ctx.fill()
}

function scatterCount(W: number, H: number, per: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round((W * H) / per)))
}

// ---- presets ----
export const PRESETS: Preset[] = [
  // ===== พาสเทลน่ารัก =====
  {
    id: 'p-pink',
    name: 'ชมพูหวาน',
    category: 'pastel',
    draw: (ctx, W, H) => linearGrad(ctx, W, H, ['#ffe4ec', '#ffc2d4', '#f6aec8']),
  },
  {
    id: 'p-sage',
    name: 'เขียวเสจ',
    category: 'pastel',
    draw: (ctx, W, H) => linearGrad(ctx, W, H, ['#eef3ea', '#cfe0c9', '#aecfa2']),
  },
  {
    id: 'p-lavender',
    name: 'ลาเวนเดอร์',
    category: 'pastel',
    draw: (ctx, W, H) => linearGrad(ctx, W, H, ['#f1ecfb', '#e0d4f7', '#ccbcee']),
  },
  {
    id: 'p-sky',
    name: 'ฟ้าใส',
    category: 'pastel',
    draw: (ctx, W, H) => linearGrad(ctx, W, H, ['#e2f1ff', '#c2e0ff', '#bcd5f5']),
  },
  {
    id: 'p-sunset',
    name: 'ซันเซ็ต',
    category: 'pastel',
    draw: (ctx, W, H) => linearGrad(ctx, W, H, ['#ffe9d6', '#ffd0dc', '#d9c8f5'], false),
  },
  {
    id: 'p-polka',
    name: 'จุดพาสเทล',
    category: 'pastel',
    draw: (ctx, W, H) => {
      linearGrad(ctx, W, H, ['#fff6f8', '#ffeef3'])
      const S = Math.min(W, H)
      const step = S * 0.09
      ctx.fillStyle = 'rgba(255,150,180,0.32)'
      let row = 0
      for (let y = step; y < H; y += step) {
        const off = row % 2 ? step / 2 : 0
        for (let x = step + off; x < W; x += step) {
          ctx.beginPath()
          ctx.arc(x, y, S * 0.012, 0, 7)
          ctx.fill()
        }
        row++
      }
    },
  },
  {
    id: 'p-hearts',
    name: 'หัวใจฟุ้ง',
    category: 'pastel',
    draw: (ctx, W, H) => {
      linearGrad(ctx, W, H, ['#fdeef5', '#f7e0ee'])
      const S = Math.min(W, H)
      const rnd = mulberry32(77)
      const n = scatterCount(W, H, 42000, 10, 110)
      for (let i = 0; i < n; i++) {
        const x = rnd() * W
        const y = rnd() * H
        const s = S * (0.02 + rnd() * 0.03)
        ctx.fillStyle = `rgba(255,140,175,${0.18 + rnd() * 0.22})`
        heartPath(ctx, x, y, s)
      }
    },
  },
  {
    id: 'p-bokeh',
    name: 'โบกะ',
    category: 'pastel',
    draw: (ctx, W, H) => {
      linearGrad(ctx, W, H, ['#f6e6f2', '#e7dcf7', '#dce8f7'])
      const S = Math.min(W, H)
      const rnd = mulberry32(21)
      const n = scatterCount(W, H, 60000, 8, 60)
      for (let i = 0; i < n; i++) {
        const x = rnd() * W
        const y = rnd() * H
        const r = S * (0.03 + rnd() * 0.08)
        ctx.fillStyle = `rgba(255,255,255,${0.1 + rnd() * 0.28})`
        ctx.beginPath()
        ctx.arc(x, y, r, 0, 7)
        ctx.fill()
      }
    },
  },
  {
    id: 'p-stars',
    name: 'ดาวระยิบ',
    category: 'pastel',
    draw: (ctx, W, H) => {
      linearGrad(ctx, W, H, ['#efe9fb', '#e6ddf6'])
      const S = Math.min(W, H)
      const rnd = mulberry32(9)
      const n = scatterCount(W, H, 46000, 10, 90)
      for (let i = 0; i < n; i++) {
        const x = rnd() * W
        const y = rnd() * H
        const s = S * (0.012 + rnd() * 0.03)
        ctx.fillStyle = `rgba(255,214,120,${0.35 + rnd() * 0.4})`
        starPath(ctx, x, y, s)
      }
    },
  },

  // ===== สตูดิโอเรียบ =====
  {
    id: 's-white',
    name: 'สตูดิโอขาว',
    category: 'studio',
    draw: (ctx, W, H) => radialGrad(ctx, W, H, '#ffffff', '#e6e6ea'),
  },
  {
    id: 's-grey',
    name: 'เทานุ่ม',
    category: 'studio',
    draw: (ctx, W, H) => linearGrad(ctx, W, H, ['#f2f2f4', '#d7d7dc', '#c4c4cb'], false),
  },
  {
    id: 's-beige',
    name: 'เบจอุ่น',
    category: 'studio',
    draw: (ctx, W, H) => radialGrad(ctx, W, H, '#f7f1e8', '#e2d6c4'),
  },
  {
    id: 's-dark',
    name: 'ดำหรู',
    category: 'studio',
    draw: (ctx, W, H) => radialGrad(ctx, W, H, '#43434d', '#191920'),
  },
  {
    id: 's-spotlight',
    name: 'สปอตไลต์',
    category: 'studio',
    draw: (ctx, W, H) => {
      ctx.fillStyle = '#20202a'
      ctx.fillRect(0, 0, W, H)
      const g = ctx.createRadialGradient(
        W / 2,
        H * 0.4,
        0,
        W / 2,
        H * 0.4,
        Math.min(W, H) * 0.75,
      )
      g.addColorStop(0, 'rgba(255,246,235,0.5)')
      g.addColorStop(1, 'rgba(255,246,235,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    },
  },
]

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id)
}

export function drawPreset(ctx: Ctx, W: number, H: number, id: string): boolean {
  const p = getPreset(id)
  if (!p) return false
  p.draw(ctx, W, H)
  return true
}
