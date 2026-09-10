import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/features/theme-settings/theme-toggle'
import { ROUTES, type RouteId } from '@/routes/routes'

export interface AppSidebarProps {
  readonly activeRoute: RouteId
  readonly onNavigate: (route: RouteId) => void
}

export function AppSidebar({ activeRoute, onNavigate }: AppSidebarProps): ReactNode {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-muted/30">
      {/* Reserves space for the macOS traffic lights and doubles as the drag region. */}
      <div className="app-drag-region flex h-12 items-end px-4 pb-1">
        <span className="text-xs font-semibold tracking-wide uppercase">Film Study Buddy</span>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 p-2">
        {ROUTES.map(({ id, label, Icon }) => (
          <Button
            key={id}
            variant={activeRoute === id ? 'outline' : 'ghost'}
            className={cn('w-full justify-start', activeRoute === id && 'font-semibold')}
            aria-current={activeRoute === id ? 'page' : undefined}
            onClick={() => onNavigate(id)}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </Button>
        ))}
      </nav>

      <div className="border-t border-border p-2">
        <ThemeToggle compact />
      </div>
    </aside>
  )
}
