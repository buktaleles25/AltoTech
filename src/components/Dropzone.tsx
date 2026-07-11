import { useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { Button } from './ui'
import { CameraIcon, Mascot, PlusIcon, SparkleIcon } from './icons'

interface Props {
  onFiles: (files: FileList | File[]) => void
  compact?: boolean
}

export function Dropzone({ onFiles, compact }: Props) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) onFiles(e.target.files)
    e.target.value = '' // ให้เลือกไฟล์เดิมซ้ำได้
  }

  const hiddenInputs = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handlePick}
      />
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handlePick}
      />
    </>
  )

  if (compact) {
    return (
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          <PlusIcon className="h-4 w-4" />
          {t.addMore}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => camRef.current?.click()}>
          <CameraIcon className="h-4 w-4" />
          {t.takePhoto}
        </Button>
        {hiddenInputs}
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files)
      }}
      className={`polka relative flex flex-col items-center gap-3 rounded-[2rem] border-[3px] border-dashed p-8 text-center transition-all ${
        drag
          ? 'scale-[1.01] border-sakura-400 bg-sakura-50'
          : 'border-sakura-200 bg-white/60'
      }`}
    >
      <SparkleIcon className="absolute left-5 top-5 h-5 w-5 animate-sparkle text-sakura-300" />
      <SparkleIcon className="absolute right-6 top-8 h-4 w-4 animate-sparkle text-lav-300" />
      <Mascot className="h-24 w-24 animate-float" />
      <div>
        <p className="font-cute text-lg font-bold text-sakura-500">{t.dropTitle}</p>
        <p className="mt-1 text-xs text-lav-500">{t.dropHint}</p>
      </div>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        <Button size="lg" onClick={() => inputRef.current?.click()}>
          <PlusIcon className="h-5 w-5" />
          {t.chooseImages}
        </Button>
        <Button variant="secondary" size="lg" onClick={() => camRef.current?.click()}>
          <CameraIcon className="h-5 w-5" />
          {t.takePhoto}
        </Button>
      </div>
      {hiddenInputs}
    </div>
  )
}
