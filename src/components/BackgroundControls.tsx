import { useEffect, useRef, useState } from 'react'
import type { BackgroundSettings, BgFill } from '../types'
import { useI18n } from '../i18n'
import { PRESETS, type Preset } from '../lib/presets'
import { preloadBgModel } from '../lib/bgRemoval'
import { Button, Row, Segmented, Toggle } from './ui'
import { SparkleIcon } from './icons'

interface Props {
  background: BackgroundSettings
  patchBackground: (patch: Partial<BackgroundSettings>) => void
}

type Mode = 'transparent' | 'color' | 'image'

function PresetThumb({
  preset,
  active,
  onClick,
}: {
  preset: Preset
  active: boolean
  onClick: () => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (ctx) preset.draw(ctx, c.width, c.height)
  }, [preset])
  return (
    <button
      type="button"
      onClick={onClick}
      title={preset.name}
      className={`overflow-hidden rounded-xl border-2 transition-all active:scale-90 ${
        active ? 'border-sakura-400 ring-2 ring-sakura-200' : 'border-white/70'
      }`}
    >
      <canvas ref={ref} width={96} height={72} className="block h-full w-full" />
    </button>
  )
}

export function BackgroundControls({ background, patchBackground }: Props) {
  const { t } = useI18n()
  const fileRef = useRef<HTMLInputElement>(null)
  const [modelPct, setModelPct] = useState<number | null>(null)
  const [modelReady, setModelReady] = useState(false)
  const [modelErr, setModelErr] = useState<string | null>(null)
  const started = useRef(false)

  // เปิดลบพื้นหลัง → โหลดโมเดลล่วงหน้า (แสดงสถานะ)
  useEffect(() => {
    if (background.removeBg && !started.current) {
      started.current = true
      setModelErr(null)
      setModelPct(0)
      preloadBgModel((p) => setModelPct(p))
        .then(() => {
          setModelReady(true)
          setModelPct(100)
        })
        .catch((e) => {
          setModelErr(e instanceof Error ? e.message : 'error')
          started.current = false // ให้ลองใหม่ได้
        })
    }
  }, [background.removeBg])

  const fill = background.fill
  const mode: Mode = fill.type === 'preset' || fill.type === 'custom' ? 'image' : fill.type
  const setFill = (f: BgFill) => patchBackground({ fill: f })

  const onModeChange = (m: Mode) => {
    if (m === 'transparent') setFill({ type: 'transparent' })
    else if (m === 'color')
      setFill({ type: 'color', color: fill.type === 'color' ? fill.color : '#ffffff' })
    else setFill({ type: 'preset', id: PRESETS[0].id })
  }

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setFill({ type: 'custom', dataUrl: String(reader.result) })
    reader.readAsDataURL(file)
  }

  const pastel = PRESETS.filter((p) => p.category === 'pastel')
  const studio = PRESETS.filter((p) => p.category === 'studio')

  return (
    <>
      <Row label={t.bgRemove}>
        <Toggle
          checked={background.removeBg}
          onChange={(v) => patchBackground({ removeBg: v })}
          label={t.bgRemove}
        />
      </Row>
      <p className="-mt-2 text-xs text-lav-500">{t.bgRemoveHint}</p>

      {/* สถานะโมเดล */}
      {background.removeBg && !modelReady && !modelErr && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-sakura-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sakura-300 to-lav-400 transition-all"
              style={{ width: `${modelPct ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-lav-500">
            🐾 {t.bgModelLoading} {modelPct != null ? `${Math.round(modelPct)}%` : ''}
          </p>
        </div>
      )}
      {modelErr && background.removeBg && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-400">
          {t.bgModelFailed}
        </p>
      )}

      {background.removeBg && (
        <div className="space-y-3 border-t-2 border-sakura-50 pt-3">
          <span className="block text-sm font-bold text-sakura-500">{t.bgNewLabel}</span>
          <Segmented<Mode>
            value={mode}
            onChange={onModeChange}
            options={[
              { value: 'transparent', label: t.bgTransparent },
              { value: 'color', label: t.bgColor },
              { value: 'image', label: t.bgImage },
            ]}
          />

          {mode === 'transparent' && (
            <p className="flex items-center gap-1.5 rounded-xl bg-sage-100 px-3 py-2 text-xs font-bold text-sage-600">
              <SparkleIcon className="h-3.5 w-3.5" />
              {t.bgTransparentPng}
            </p>
          )}

          {mode === 'color' && (
            <div className="flex items-center gap-3">
              <span
                className="relative inline-flex h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow"
                style={{ backgroundColor: fill.type === 'color' ? fill.color : '#ffffff' }}
              >
                <input
                  type="color"
                  value={fill.type === 'color' ? fill.color : '#ffffff'}
                  onChange={(e) => setFill({ type: 'color', color: e.target.value })}
                  className="absolute inset-[-4px] h-[calc(100%+8px)] w-[calc(100%+8px)] cursor-pointer opacity-0"
                />
              </span>
              <span className="text-sm font-bold text-sakura-500">
                {fill.type === 'color' ? fill.color : '#ffffff'}
              </span>
            </div>
          )}

          {mode === 'image' && (
            <div className="space-y-3">
              <div>
                <span className="mb-1 block text-xs font-bold text-lav-500">🎀 {t.bgPastel}</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {pastel.map((p) => (
                    <PresetThumb
                      key={p.id}
                      preset={p}
                      active={fill.type === 'preset' && fill.id === p.id}
                      onClick={() => setFill({ type: 'preset', id: p.id })}
                    />
                  ))}
                </div>
              </div>
              <div>
                <span className="mb-1 block text-xs font-bold text-lav-500">📷 {t.bgStudio}</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {studio.map((p) => (
                    <PresetThumb
                      key={p.id}
                      preset={p}
                      active={fill.type === 'preset' && fill.id === p.id}
                      onClick={() => setFill({ type: 'preset', id: p.id })}
                    />
                  ))}
                </div>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onUpload}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                  {t.bgUpload}
                </Button>
                {fill.type === 'custom' && (
                  <span className="h-10 w-10 overflow-hidden rounded-lg border-2 border-sakura-300">
                    <img src={fill.dataUrl} alt="" className="h-full w-full object-cover" />
                  </span>
                )}
              </div>
            </div>
          )}

          <p className="text-[0.7rem] text-lav-400">{t.bgSpeedNote}</p>
        </div>
      )}
    </>
  )
}
