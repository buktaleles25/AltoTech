import { useCallback, useEffect, useState } from 'react'
import type {
  BackgroundSettings,
  LogoWatermark,
  OutputSettings,
  TextWatermark,
  WatermarkSettings,
} from '../types'

export const DEFAULT_SETTINGS: WatermarkSettings = {
  text: {
    enabled: true,
    text: '© ชื่อของคุณ',
    fontFamily: "'Mali', sans-serif",
    sizePct: 6,
    color: '#ffffff',
    opacity: 0.9,
    outline: true,
    outlineColor: '#ff6b95',
  },
  logo: {
    enabled: false,
    dataUrl: null,
    sizePct: 20,
    opacity: 0.9,
  },
  anchor: 'bottom-right',
  rotationDeg: 0,
  marginPct: 4,
  tileGapPct: 8,
}

export const DEFAULT_OUTPUT: OutputSettings = {
  format: 'image/jpeg',
  quality: 0.9,
  maxEdge: null,
  filenamePrefix: '',
}

export const DEFAULT_BACKGROUND: BackgroundSettings = {
  removeBg: false,
  fill: { type: 'transparent' },
}

const SETTINGS_KEY = 'wm-settings-v1'
const OUTPUT_KEY = 'wm-output-v1'
const BACKGROUND_KEY = 'wm-background-v1'

function loadSettings(): WatermarkSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<WatermarkSettings>
    // merge กับ default เผื่อ schema เปลี่ยน; ไม่คืน dataUrl โลโก้ (ไม่ได้ persist)
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      text: { ...DEFAULT_SETTINGS.text, ...parsed.text },
      logo: { ...DEFAULT_SETTINGS.logo, ...parsed.logo, dataUrl: null },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function loadOutput(): OutputSettings {
  try {
    const raw = localStorage.getItem(OUTPUT_KEY)
    if (!raw) return DEFAULT_OUTPUT
    return { ...DEFAULT_OUTPUT, ...(JSON.parse(raw) as Partial<OutputSettings>) }
  } catch {
    return DEFAULT_OUTPUT
  }
}

function loadBackground(): BackgroundSettings {
  try {
    const raw = localStorage.getItem(BACKGROUND_KEY)
    if (!raw) return DEFAULT_BACKGROUND
    const parsed = { ...DEFAULT_BACKGROUND, ...(JSON.parse(raw) as Partial<BackgroundSettings>) }
    // custom dataUrl ไม่ได้ persist → ถ้าโหลดมาเป็น custom ให้กลับเป็นโปร่งใส
    if (parsed.fill?.type === 'custom') parsed.fill = { type: 'transparent' }
    return parsed
  } catch {
    return DEFAULT_BACKGROUND
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<WatermarkSettings>(loadSettings)
  const [output, setOutput] = useState<OutputSettings>(loadOutput)
  const [background, setBackground] = useState<BackgroundSettings>(loadBackground)

  // persist (โลโก้ dataUrl ถูกตัดออกเพื่อกัน localStorage เต็ม)
  useEffect(() => {
    try {
      const toSave: WatermarkSettings = {
        ...settings,
        logo: { ...settings.logo, dataUrl: null },
      }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave))
    } catch {
      // ignore quota errors
    }
  }, [settings])

  useEffect(() => {
    try {
      localStorage.setItem(OUTPUT_KEY, JSON.stringify(output))
    } catch {
      // ignore
    }
  }, [output])

  // persist background (custom dataUrl ถูกตัดออกกัน localStorage เต็ม)
  useEffect(() => {
    try {
      const toSave: BackgroundSettings =
        background.fill.type === 'custom'
          ? { ...background, fill: { type: 'transparent' } }
          : background
      localStorage.setItem(BACKGROUND_KEY, JSON.stringify(toSave))
    } catch {
      // ignore
    }
  }, [background])

  const patchText = useCallback((patch: Partial<TextWatermark>) => {
    setSettings((s) => ({ ...s, text: { ...s.text, ...patch } }))
  }, [])

  const patchLogo = useCallback((patch: Partial<LogoWatermark>) => {
    setSettings((s) => ({ ...s, logo: { ...s.logo, ...patch } }))
  }, [])

  const patchSettings = useCallback((patch: Partial<WatermarkSettings>) => {
    setSettings((s) => ({ ...s, ...patch }))
  }, [])

  const patchOutput = useCallback((patch: Partial<OutputSettings>) => {
    setOutput((o) => ({ ...o, ...patch }))
  }, [])

  const patchBackground = useCallback((patch: Partial<BackgroundSettings>) => {
    setBackground((b) => ({ ...b, ...patch }))
  }, [])

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    setOutput(DEFAULT_OUTPUT)
    setBackground(DEFAULT_BACKGROUND)
  }, [])

  return {
    settings,
    output,
    background,
    patchText,
    patchLogo,
    patchSettings,
    patchOutput,
    patchBackground,
    reset,
  }
}
