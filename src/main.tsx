import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { initErrorMonitor } from './utils/errorMonitor.ts'
import { initWebVitals } from './utils/webVitals.ts'
import { initializeDefaultVoice } from './services/cloudTts.ts'

initErrorMonitor();
initWebVitals();
initializeDefaultVoice();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
