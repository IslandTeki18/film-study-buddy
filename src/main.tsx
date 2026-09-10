import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider } from 'convex/react'
import { App } from './app'
import { ErrorBoundary } from './components/error-boundary'
import { convexClient } from './convex-client'
import { ThemeProvider } from './features/theme-settings/theme-provider'
import { ToastProvider } from './components/ui/toast'
import './index.css'

const container = document.getElementById('root')
if (container === null) {
  throw new Error('Root container #root is missing from index.html')
}

function withConvex(children: ReactNode): ReactNode {
  // Without VITE_CONVEX_URL the app still runs: theme settings are local-only until Auth is
  // selected, and app.tsx surfaces the missing configuration.
  return convexClient === null ? (
    children
  ) : (
    <ConvexProvider client={convexClient}>{children}</ConvexProvider>
  )
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      {withConvex(
        <ThemeProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ThemeProvider>,
      )}
    </ErrorBoundary>
  </StrictMode>,
)
