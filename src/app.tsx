import { useState, type ReactNode } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { isConvexConfigured } from '@/convex-client'
import { DEFAULT_ROUTE, type RouteId } from '@/routes/routes'
import { HomePage } from '@/routes/home-page'
import { SettingsPage } from '@/routes/settings-page'
import { ScratchPage } from '@/routes/scratch-page'

// ponytail: two screens, so view state replaces a router. Swap in a router when routes grow
// deep links or history.
export function App(): ReactNode {
  const [route, setRoute] = useState<RouteId>(DEFAULT_ROUTE)

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <AppSidebar activeRoute={route} onNavigate={setRoute} />
      <main className="flex-1 overflow-y-auto">
        {!isConvexConfigured && (
          <p className="border-b border-border bg-muted px-4 py-2 text-xs">
            Convex is not configured. Set <code>VITE_CONVEX_URL</code> in <code>.env</code> and
            restart. Theme settings work locally in the meantime.
          </p>
        )}
        {window.location.hash === '#/scratch' ? (
          <ScratchPage />
        ) : route === 'settings' ? (
          <SettingsPage />
        ) : (
          <HomePage />
        )}
      </main>
    </div>
  )
}
