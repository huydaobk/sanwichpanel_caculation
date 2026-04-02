import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// ── Fonts tự host — hoạt động offline, không cần internet ──
// Inter: body text — Vietnamese subset cho tiếng Việt chuẩn
import '@fontsource/inter/vietnamese-300.css'
import '@fontsource/inter/vietnamese-400.css'
import '@fontsource/inter/vietnamese-500.css'
import '@fontsource/inter/vietnamese-600.css'
import '@fontsource/inter/vietnamese-700.css'
import '@fontsource/inter/vietnamese-400-italic.css'
// Latin-ext: ký tự đặc biệt kỹ thuật (±, ×, ÷, ...)
import '@fontsource/inter/latin-ext-400.css'
import '@fontsource/inter/latin-ext-600.css'
import '@fontsource/inter/latin-ext-700.css'

// JetBrains Mono: công thức / code block
import '@fontsource/jetbrains-mono/vietnamese-400.css'
import '@fontsource/jetbrains-mono/vietnamese-500.css'
import '@fontsource/jetbrains-mono/vietnamese-600.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-600.css'

import './index.css'
import App from './App.jsx'


import { ErrorBoundary } from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
