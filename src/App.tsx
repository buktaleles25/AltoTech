import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from './i18n'
import { useImages } from './hooks/useImages'
import { useSettings } from './hooks/useSettings'
import { useProcessor } from './hooks/useProcessor'
import { isIOS } from './lib/share'
import { Header } from './components/Header'
import { Dropzone } from './components/Dropzone'
import { PreviewCanvas } from './components/PreviewCanvas'
import { SettingsPanel } from './components/SettingsPanel'
import { ImageGrid } from './components/ImageGrid'
import { ProcessBar } from './components/ProcessBar'
import { ExportBar } from './components/ExportBar'
import { Toast } from './components/Toast'
import { Card } from './components/ui'
import { HeartIcon } from './components/icons'

export function App() {
  const { t } = useI18n()
  const { images, addFiles, removeImage, clearAll, updateImage } = useImages()
  const { settings, output, patchText, patchLogo, patchSettings, patchOutput, reset } =
    useSettings()
  const { processing, progress, run, cancel } = useProcessor({
    images,
    settings,
    output,
    updateImage,
  })

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number>(0)
  const notify = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3800)
  }, [])

  const doneCount = useMemo(
    () => images.filter((i) => i.status === 'done').length,
    [images],
  )
  const hasImages = images.length > 0
  const representative = images[0]

  // แจ้งเตือนหลังประมวลผลเสร็จ (iOS hint ครั้งแรก + รายงานรูปที่พลาด)
  const wasProcessing = useRef(false)
  useEffect(() => {
    if (wasProcessing.current && !processing) {
      const errors = images.filter((i) => i.status === 'error').length
      const done = images.some((i) => i.status === 'done')
      if (errors > 0) {
        notify(t.someErrors(errors))
      } else if (done && isIOS()) {
        try {
          if (!localStorage.getItem('wm-ios-hint')) {
            notify(t.iosHint)
            localStorage.setItem('wm-ios-hint', '1')
          }
        } catch {
          // ignore
        }
      }
    }
    wasProcessing.current = processing
  }, [processing, images, notify, t])

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header />

      <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 pb-44 pt-2">
        {!hasImages ? (
          <>
            <Dropzone onFiles={addFiles} />
            <p className="text-center text-sm font-bold text-lav-400">{t.emptyHint}</p>
          </>
        ) : (
          <>
            {/* preview */}
            <section className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-1">
                <HeartIcon className="h-4 w-4 text-sakura-400" />
                <span className="text-sm font-bold text-sakura-500">{t.preview}</span>
                <span className="text-xs text-lav-400">· {t.previewHint}</span>
              </div>
              <PreviewCanvas item={representative} settings={settings} />
            </section>

            {/* settings */}
            <SettingsPanel
              settings={settings}
              output={output}
              patchText={patchText}
              patchLogo={patchLogo}
              patchSettings={patchSettings}
              patchOutput={patchOutput}
              onReset={reset}
            />

            {/* gallery header */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-sm font-bold text-sakura-500">
                🖼️ {t.imagesCount(images.length)}
                {doneCount > 0 ? ` · ${t.doneCount(doneCount)}` : ''}
              </span>
              <div className="flex items-center gap-2">
                <Dropzone onFiles={addFiles} compact />
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-full border-2 border-rose-100 bg-white/70 px-3 py-1.5 text-sm font-bold text-rose-400 transition active:scale-95"
                >
                  {t.clearAll}
                </button>
              </div>
            </div>

            <ImageGrid images={images} onRemove={removeImage} notify={notify} />
          </>
        )}
      </main>

      {/* sticky action bar */}
      {hasImages && (
        <div className="safe-b fixed inset-x-0 bottom-0 z-40 px-3 pt-2">
          <div className="mx-auto max-w-xl">
            <Card className="space-y-2 p-3">
              {doneCount > 0 && !processing && (
                <ExportBar results={images} notify={notify} />
              )}
              <ProcessBar
                processing={processing}
                progress={progress}
                hasImages={hasImages}
                doneCount={doneCount}
                onRun={run}
                onCancel={cancel}
              />
            </Card>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  )
}
