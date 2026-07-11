import { useMemo, useState } from 'react'
import type { ImageItem } from '../types'
import { useI18n } from '../i18n'
import { blobToFile, downloadBlob, shareFiles, supportsFileShare } from '../lib/share'
import { zipImages } from '../lib/zip'
import { Button } from './ui'
import { DownloadIcon, ShareIcon } from './icons'

interface Props {
  results: ImageItem[]
  notify?: (msg: string) => void
}

export function ExportBar({ results, notify }: Props) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const canShare = useMemo(() => supportsFileShare(), [])

  const ready = results.filter((r) => r.resultBlob && r.resultName)
  if (ready.length === 0) return null

  const zipAll = async () => {
    setBusy(true)
    try {
      const blob = await zipImages(
        ready.map((r) => ({ name: r.resultName as string, blob: r.resultBlob as Blob })),
      )
      downloadBlob(blob, 'watermarked.zip')
      notify?.(t.zipReady)
    } catch {
      notify?.(t.shareError)
    } finally {
      setBusy(false)
    }
  }

  const shareAll = async () => {
    const files = ready.map((r) => blobToFile(r.resultBlob as Blob, r.resultName as string))
    const res = await shareFiles(files, t.appName)
    if (res === 'cancelled') {
      notify?.(t.shareCancelled)
      return
    }
    if (res === 'shared') return
    // unsupported / error -> fallback เป็น ZIP
    await zipAll()
  }

  return (
    <div className="flex gap-2">
      {canShare && (
        <Button fullWidth size="lg" onClick={shareAll}>
          <ShareIcon className="h-5 w-5" />
          {t.shareToPhotos}
        </Button>
      )}
      <Button
        fullWidth
        size="lg"
        variant={canShare ? 'secondary' : 'primary'}
        disabled={busy}
        onClick={zipAll}
      >
        <DownloadIcon className="h-5 w-5" />
        {busy ? t.processing : t.downloadZip}
      </Button>
    </div>
  )
}
