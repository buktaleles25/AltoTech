// ---- ตำแหน่งลายน้ำ ----
// 9 จุด (3x3) + tile (ปูซ้ำทั้งรูป)
export type Anchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'tile'

// ---- ลายน้ำข้อความ ----
export interface TextWatermark {
  enabled: boolean
  text: string
  fontFamily: string
  sizePct: number // % ของด้านสั้นของรูป
  color: string // hex เช่น #ffffff
  opacity: number // 0..1
  outline: boolean
  outlineColor: string
}

// ---- ลายน้ำโลโก้/รูป ----
export interface LogoWatermark {
  enabled: boolean
  dataUrl: string | null // เก็บโลโก้เป็น data URL (persist ได้)
  sizePct: number // % ของด้านสั้น (ความกว้างโลโก้)
  opacity: number // 0..1
}

// ---- การตั้งค่าลายน้ำทั้งหมด ----
export interface WatermarkSettings {
  text: TextWatermark
  logo: LogoWatermark
  anchor: Anchor
  rotationDeg: number // หมุนทั้ง stamp/field (-180..180)
  marginPct: number // ระยะขอบ % ของด้านสั้น
  tileGapPct: number // ระยะห่างโหมด tile % ของด้านสั้น
}

// ---- การตั้งค่าไฟล์ส่งออก ----
export type OutputFormat = 'image/jpeg' | 'image/png'

export interface OutputSettings {
  format: OutputFormat
  quality: number // 0..1 (ใช้กับ jpeg)
  maxEdge: number | null // จำกัดด้านยาวสุด (px); null = ขนาดเดิม
  filenamePrefix: string
}

// ---- พื้นหลังใหม่ (หลังลบพื้นหลัง AI) ----
export type BgFill =
  | { type: 'transparent' }
  | { type: 'color'; color: string }
  | { type: 'preset'; id: string }
  | { type: 'custom'; dataUrl: string }

export interface BackgroundSettings {
  removeBg: boolean // เปิดลบพื้นหลังอัตโนมัติ (AI)
  fill: BgFill // จะวางอะไรหลังลบพื้นหลัง
}

// ---- สถานะรูปแต่ละไฟล์ ----
export type ImageStatus = 'pending' | 'processing' | 'done' | 'error'

export interface ImageItem {
  id: string
  file: File
  name: string
  thumbUrl: string // object URL สำหรับ thumbnail (รูปต้นฉบับ)
  width?: number
  height?: number
  status: ImageStatus
  error?: string
  resultBlob?: Blob
  resultUrl?: string // object URL ของรูปที่ใส่ลายน้ำแล้ว
  resultName?: string
}
