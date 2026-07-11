import type { ImageItem } from '../types'
import { useI18n } from '../i18n'
import { blobToFile, downloadBlob, shareFiles } from '../lib/share'
import { CheckIcon, DownloadIcon, ShareIcon, TrashIcon, XIcon } from './icons'

interface Props {
  item: ImageItem
  onRemove: (id: string) => void
  notify?: (msg: string) => void
}

export function ImageCard({ item, onRemove, notify }: Props) {
  const { t } = useI18n()
  const done = item.status === 'done'
  const src = item.resultUrl ?? item.thumbUrl

  const share = async () => {
    if (!item.resultBlob || !item.resultName) return
    const file = blobToFile(item.resultBlob, item.resultName)
    const res = await shareFiles([file], item.resultName)
    if (res === 'unsupported') downloadBlob(item.resultBlob, item.resultName)
    else if (res === 'error') notify?.(t.shareError)
  }

  const download = () => {
    if (item.resultBlob && item.resultName) downloadBlob(item.resultBlob, item.resultName)
  }

  return (
    <div className="animate-pop relative overflow-hidden rounded-3xl border-2 border-sakura-100 bg-white shadow-soft">
      <div className="relative aspect-square bg-[conic-gradient(#f6eefc_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
        <img src={src} alt={item.name} className="h-full w-full object-cover" loading="lazy" />

        {/* remove */}
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={t.remove}
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-rose-400 shadow transition active:scale-90"
        >
          <TrashIcon className="h-4 w-4" />
        </button>

        {/* status badge */}
        {item.status === 'processing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50">
            <span className="animate-bounce-soft text-2xl">🐾</span>
          </div>
        )}
        {done && (
          <div className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-sage-300 text-sage-600 shadow">
            <CheckIcon className="h-4 w-4" />
          </div>
        )}
        {item.status === 'error' && (
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-rose-400/90 px-2 py-1 text-[0.65rem] font-bold text-white">
            <XIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.error ?? 'error'}</span>
          </div>
        )}

        {/* per-image actions */}
        {done && (
          <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/45 to-transparent p-1.5">
            <button
              type="button"
              onClick={share}
              className="flex flex-1 items-center justify-center gap-1 rounded-full bg-white/90 py-1 text-xs font-bold text-sakura-500 shadow active:scale-95"
            >
              <ShareIcon className="h-3.5 w-3.5" />
              {t.shareOne}
            </button>
            <button
              type="button"
              onClick={download}
              className="flex flex-1 items-center justify-center gap-1 rounded-full bg-white/90 py-1 text-xs font-bold text-lav-500 shadow active:scale-95"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              {t.downloadOne}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
