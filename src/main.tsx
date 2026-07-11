import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/mali/400.css'
import '@fontsource/mali/500.css'
import '@fontsource/mali/700.css'
import '@fontsource/itim/400.css'
import './index.css'
import { App } from './App'
import { I18nProvider } from './i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
