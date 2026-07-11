import { useI18n } from '../i18n'
import { Mascot, SparkleIcon } from './icons'

export function Header() {
  const { t, toggle } = useI18n()
  return (
    <header className="safe-t px-4 pt-4 pb-1">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <Mascot className="h-14 w-14 animate-float drop-shadow-sm" />
        <div className="flex-1">
          <h1 className="font-cute text-2xl font-bold leading-tight text-sakura-500">
            {t.appName} <span className="align-middle">🎀</span>
          </h1>
          <p className="text-xs text-lav-500">{t.tagline}</p>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="rounded-full border-2 border-sakura-100 bg-white/70 px-3 py-1.5 text-sm font-bold text-sakura-400 transition active:scale-95"
        >
          {t.langLabel}
        </button>
      </div>
      <div className="mx-auto mt-2 flex max-w-xl items-center justify-center gap-1.5 rounded-full bg-mint-200/70 px-3 py-1.5 text-center text-[0.72rem] font-bold text-emerald-700">
        <SparkleIcon className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        {t.privacy}
      </div>
    </header>
  )
}
