import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider } from 'convex/react'
import { RouterProvider } from 'react-router'
import { ErrorBoundary } from './components/error-boundary'
import { convexClient } from './convex-client'
import { ThemeProvider } from './features/theme-settings/theme-provider'
import { ToastProvider } from './components/ui/toast'
import { AccountGate } from './features/auth/account-gate'
import { router } from './routes/routes'
import './index.css'

const container = document.getElementById('root')
if (container === null) {
  throw new Error('Root container #root is missing from index.html')
}

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim() ?? ''

function withConvex(children: ReactNode): ReactNode {
  // Without VITE_CONVEX_URL the app still runs: theme settings are local-only until Auth is
  // selected, and app.tsx surfaces the missing configuration.
  if (convexClient === null) return children
  // ponytail: sign-in is on only when a Clerk key is configured, so dev keeps working during the
  // accounts rollout; require the key once every function checks the owner (hosted-accounts plan S8).
  return clerkKey
    ? <AccountGate publishableKey={clerkKey} client={convexClient}>{children}</AccountGate>
    : <ConvexProvider client={convexClient}>{children}</ConvexProvider>
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      {withConvex(
        <ThemeProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </ThemeProvider>,
      )}
    </ErrorBoundary>
  </StrictMode>,
)
