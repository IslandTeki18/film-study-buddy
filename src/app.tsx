import { useEffect, useState, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { ErrorBoundary } from '@/components/error-boundary'
import { isConvexConfigured } from '@/convex-client'
import { ShortcutHelp } from '@/components/shortcut-help'
import { ConnectionBanner } from '@/components/connection-banner'

export function App(): ReactNode {
  return isConvexConfigured ? <FirstLaunchGate /> : <AppShell />
}

/** First open installs the Defensive Line template; there is nothing to choose. */
function FirstLaunchGate(): ReactNode {
  const settings = useQuery(api.settings.get, {})
  const complete = useMutation(api.settings.completeFirstLaunch)
  const needsSetup = settings !== undefined && settings?.firstLaunchCompletedAt === undefined
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!needsSetup) return
    setError('')
    void complete({}).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)))
  }, [needsSetup, complete, attempt])
  if (error) return <><ConnectionBanner /><div role="alert" className="m-6 space-y-3">
    <p>Could not set up the defensive line notebook. {error}</p>
    <button type="button" className="rounded border border-border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setAttempt((count) => count + 1)}>Try again</button>
  </div></>
  if (settings === undefined || needsSetup) return <><ConnectionBanner /><div role="status" aria-label="Loading settings" className="m-6 h-24 animate-pulse rounded bg-muted" /></>
  return <AppShell />
}

/** Each screen renders its own header (AppHeader or the workspace header), so the shell is just the scroll container. */
function AppShell(): ReactNode {
  const location = useLocation()
  return (
    <main className="flex h-screen w-screen flex-col overflow-y-auto print:block print:h-auto print:w-auto print:overflow-visible">
      {!isConvexConfigured && (
        <p className="border-b border-border bg-muted px-4 py-2 font-mono text-xs">
          Convex is not configured. Set <code>VITE_CONVEX_URL</code> in <code>.env</code> and
          restart. Theme settings work locally in the meantime.
        </p>
      )}
      {isConvexConfigured && <ConnectionBanner />}
      <ErrorBoundary key={location.pathname}><Outlet /></ErrorBoundary>
      <ShortcutHelp />
    </main>
  )
}
