import { useRef, useState } from 'react'
import type {
  LogoWatermark,
  OutputFormat,
  OutputSettings,
  TextWatermark,
  WatermarkSettings,
} from '../types'
import { useI18n } from '../i18n'
import { Button, Card, Row, Segmented, Slider, Toggle } from './ui'
import { PositionPicker } from './PositionPicker'
import { HeartIcon, StarIcon } from './icons'

interface Props {
  settings: WatermarkSettings
  output: OutputSettings
  patchText: (p: Partial<TextWatermark>) => void
  patchLogo: (p: Partial<LogoWatermark>) => void
  patchSettings: (p: Partial<WatermarkSettings>) => void
  patchOutput: (p: Partial<OutputSettings>) => void
  onReset: () => void
}

type Tab = 'text' | 'logo' | 'layout' | 'output'

const FONTS = [
  { value: "'Mali', sans-serif", label: 'Mali' },
  { value: "'Itim', cursive", label: 'Itim' },
  { value: 'system-ui, -apple-system, sans-serif', label: 'Aa' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Serif' },
]

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-bold text-sakura-500">
      <span
        className="relative inline-flex h-9 w-9 overflow-hidden rounded-full border-2 border-white shadow"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-[-4px] h-[calc(100%+8px)] w-[calc(100%+8px)] cursor-pointer opacity-0"
        />
      </span>
      {label}
    </label>
  )
}

export function SettingsPanel({
  settings,
  output,
  patchText,
  patchLogo,
  patchSettings,
  patchOutput,
  onReset,
}: Props) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('text')
  const logoInputRef = useRef<HTMLInputElement>(null)

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: 'text', label: t.tabText, emoji: '✏️' },
    { id: 'logo', label: t.tabLogo, emoji: '🎀' },
    { id: 'layout', label: t.tabLayout, emoji: '📐' },
    { id: 'output', label: t.tabOutput, emoji: '💾' },
  ]

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      patchLogo({ dataUrl: String(reader.result), enabled: true })
    }
    reader.readAsDataURL(file)
  }

  return (
    <Card className="overflow-hidden">
      {/* tab bar */}
      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b-2 border-sakura-50 p-2">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={`flex-1 whitespace-nowrap rounded-2xl px-3 py-2 text-sm font-bold transition-all active:scale-95 ${
              tab === tb.id
                ? 'bg-gradient-to-b from-sakura-400 to-sakura-500 text-white shadow-cute'
                : 'text-lav-500 hover:bg-lav-100'
            }`}
          >
            <span className="mr-1">{tb.emoji}</span>
            {tb.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-4">
        {/* ===== TEXT ===== */}
        {tab === 'text' && (
          <>
            <Row label={t.enable}>
              <Toggle
                checked={settings.text.enabled}
                onChange={(v) => patchText({ enabled: v })}
                label={t.enable}
              />
            </Row>
            <div className={settings.text.enabled ? '' : 'pointer-events-none opacity-40'}>
              <input
                type="text"
                value={settings.text.text}
                onChange={(e) => patchText({ text: e.target.value })}
                placeholder={t.textPlaceholder}
                className="w-full rounded-2xl border-2 border-sakura-100 bg-white px-4 py-2.5 font-cute text-sakura-600 outline-none focus:border-sakura-300"
              />

              <div className="mt-3">
                <span className="mb-1 block text-sm font-bold text-sakura-500">{t.font}</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {FONTS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => patchText({ fontFamily: f.value })}
                      style={{ fontFamily: f.value }}
                      className={`rounded-xl border-2 py-2 text-base transition-all active:scale-95 ${
                        settings.text.fontFamily === f.value
                          ? 'border-sakura-300 bg-sakura-50 text-sakura-500'
                          : 'border-lav-200 bg-white/60 text-lav-500'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 space-y-3">
                <Slider
                  label={t.size}
                  icon={<StarIcon className="h-3.5 w-3.5" />}
                  value={settings.text.sizePct}
                  min={2}
                  max={20}
                  step={0.5}
                  display={`${settings.text.sizePct}%`}
                  onChange={(v) => patchText({ sizePct: v })}
                />
                <Slider
                  label={t.opacity}
                  icon={<HeartIcon className="h-3.5 w-3.5" />}
                  value={Math.round(settings.text.opacity * 100)}
                  min={5}
                  max={100}
                  display={`${Math.round(settings.text.opacity * 100)}%`}
                  onChange={(v) => patchText({ opacity: v / 100 })}
                />
                <div className="flex items-center justify-between gap-3">
                  <ColorField
                    label={t.color}
                    value={settings.text.color}
                    onChange={(v) => patchText({ color: v })}
                  />
                  {settings.text.outline && (
                    <ColorField
                      label={t.outlineColor}
                      value={settings.text.outlineColor}
                      onChange={(v) => patchText({ outlineColor: v })}
                    />
                  )}
                </div>
                <Row label={t.outline}>
                  <Toggle
                    checked={settings.text.outline}
                    onChange={(v) => patchText({ outline: v })}
                    label={t.outline}
                  />
                </Row>
              </div>
            </div>
          </>
        )}

        {/* ===== LOGO ===== */}
        {tab === 'logo' && (
          <>
            <Row label={t.enable}>
              <Toggle
                checked={settings.logo.enabled}
                onChange={(v) => patchLogo({ enabled: v })}
                label={t.enable}
              />
            </Row>
            <div className={settings.logo.enabled ? '' : 'pointer-events-none opacity-40'}>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/*"
                hidden
                onChange={handleLogoUpload}
              />
              {settings.logo.dataUrl ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-sakura-100 bg-[conic-gradient(#f6eefc_0_25%,#fff_0_50%)] bg-[length:14px_14px]">
                    <img
                      src={settings.logo.dataUrl}
                      alt="logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="secondary" onClick={() => logoInputRef.current?.click()}>
                      {t.changeLogo}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => patchLogo({ dataUrl: null, enabled: false })}
                    >
                      {t.removeLogo}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-2xl border-[3px] border-dashed border-sakura-200 bg-white/50 p-6 text-sm font-bold text-lav-500 transition active:scale-95"
                >
                  <span className="text-3xl">🎀</span>
                  {t.logoNeeded}
                </button>
              )}

              <div className="mt-3 space-y-3">
                <Slider
                  label={t.logoSize}
                  value={settings.logo.sizePct}
                  min={5}
                  max={60}
                  display={`${settings.logo.sizePct}%`}
                  onChange={(v) => patchLogo({ sizePct: v })}
                />
                <Slider
                  label={t.logoOpacity}
                  value={Math.round(settings.logo.opacity * 100)}
                  min={5}
                  max={100}
                  display={`${Math.round(settings.logo.opacity * 100)}%`}
                  onChange={(v) => patchLogo({ opacity: v / 100 })}
                />
              </div>
            </div>
          </>
        )}

        {/* ===== LAYOUT ===== */}
        {tab === 'layout' && (
          <>
            <span className="block text-sm font-bold text-sakura-500">{t.position}</span>
            <PositionPicker
              value={settings.anchor}
              onChange={(a) => patchSettings({ anchor: a })}
            />
            <div className="space-y-3 pt-1">
              <Slider
                label={t.rotation}
                value={settings.rotationDeg}
                min={-45}
                max={45}
                display={`${settings.rotationDeg}°`}
                onChange={(v) => patchSettings({ rotationDeg: v })}
              />
              {settings.anchor === 'tile' ? (
                <Slider
                  label={t.tileGap}
                  value={settings.tileGapPct}
                  min={0}
                  max={30}
                  display={`${settings.tileGapPct}%`}
                  onChange={(v) => patchSettings({ tileGapPct: v })}
                />
              ) : (
                <Slider
                  label={t.margin}
                  value={settings.marginPct}
                  min={0}
                  max={15}
                  step={0.5}
                  display={`${settings.marginPct}%`}
                  onChange={(v) => patchSettings({ marginPct: v })}
                />
              )}
            </div>
          </>
        )}

        {/* ===== OUTPUT ===== */}
        {tab === 'output' && (
          <>
            <div>
              <span className="mb-1 block text-sm font-bold text-sakura-500">{t.format}</span>
              <Segmented<OutputFormat>
                value={output.format}
                onChange={(v) => patchOutput({ format: v })}
                options={[
                  { value: 'image/jpeg', label: 'JPG' },
                  { value: 'image/png', label: 'PNG' },
                ]}
              />
            </div>
            {output.format === 'image/jpeg' && (
              <Slider
                label={t.quality}
                value={Math.round(output.quality * 100)}
                min={50}
                max={100}
                display={`${Math.round(output.quality * 100)}%`}
                onChange={(v) => patchOutput({ quality: v / 100 })}
              />
            )}
            <div>
              <span className="mb-1 block text-sm font-bold text-sakura-500">{t.maxSize}</span>
              <Segmented<number>
                value={output.maxEdge ?? 0}
                onChange={(v) => patchOutput({ maxEdge: v === 0 ? null : v })}
                options={[
                  { value: 0, label: t.original },
                  { value: 1280, label: '1280' },
                  { value: 2048, label: '2048' },
                  { value: 3000, label: '3000' },
                ]}
              />
            </div>
            <div>
              <span className="mb-1 block text-sm font-bold text-sakura-500">{t.prefix}</span>
              <input
                type="text"
                value={output.filenamePrefix}
                onChange={(e) => patchOutput({ filenamePrefix: e.target.value })}
                placeholder={t.prefixPlaceholder}
                className="w-full rounded-2xl border-2 border-sakura-100 bg-white px-4 py-2.5 font-cute text-sakura-600 outline-none focus:border-sakura-300"
              />
            </div>
            <div className="pt-1">
              <Button variant="ghost" size="sm" onClick={onReset}>
                ↺ {t.resetSettings}
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
