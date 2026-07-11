import { useI18n } from '../i18n'
import { Button } from './ui'
import { SparkleIcon } from './icons'

interface Props {
  processing: boolean
  progress: { done: number; total: number }
  hasImages: boolean
  doneCount: number
  onRun: () => void
  onCancel: () => void
}

export function ProcessBar({
  processing,
  progress,
  hasImages,
  doneCount,
  onRun,
  onCancel,
}: Props) {
  const { t } = useI18n()

  if (processing) {
    const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0
    return (
      <div className="space-y-1.5">
        <div className="h-3 w-full overflow-hidden rounded-full bg-sakura-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sakura-300 to-lav-400 transition-all duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-sakura-500">
            🐾 {t.processing} {t.progress(progress.done, progress.total)}
          </span>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t.cancel}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button fullWidth size="lg" disabled={!hasImages} onClick={onRun}>
      <SparkleIcon className="h-5 w-5" />
      {doneCount > 0 ? t.reapply : t.applyAll}
    </Button>
  )
}
