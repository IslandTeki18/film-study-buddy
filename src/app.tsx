import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { AppSidebar } from '@/components/app-sidebar'
import { ErrorBoundary } from '@/components/error-boundary'
import { isConvexConfigured } from '@/convex-client'

export function App(): ReactNode {
  return isConvexConfigured ? <FirstLaunchGate /> : <AppShell />
}

function FirstLaunchGate(): ReactNode {
  const settings = useQuery(api.settings.get, {})
  if (settings === undefined) return <div role="status" aria-label="Loading settings" className="m-6 h-24 animate-pulse rounded bg-muted" />
  if (settings?.firstLaunchCompletedAt === undefined) return <Navigate to="/welcome" replace />
  return <AppShell />
}

function AppShell(): ReactNode {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        {!isConvexConfigured && (
          <p className="border-b border-border bg-muted px-4 py-2 text-xs">
            Convex is not configured. Set <code>VITE_CONVEX_URL</code> in <code>.env</code> and
            restart. Theme settings work locally in the meantime.
          </p>
        )}
        <ErrorBoundary><Outlet /></ErrorBoundary>
      </main>
    </div>
  )
}
