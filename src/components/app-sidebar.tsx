import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { ThemeToggle } from '@/features/theme-settings/theme-toggle'
import { isConvexConfigured } from '@/convex-client'
import { SeasonPicker } from '@/features/seasons/season-picker'
import { ROUTES } from '@/routes/routes'

export function AppSidebar(): ReactNode {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-muted/30">
      {/* Reserves space for the macOS traffic lights and doubles as the drag region. */}
      <div className="app-drag-region flex h-12 items-end px-4 pb-1">
        <span className="text-xs font-semibold tracking-wide uppercase">Film Study Buddy</span>
      </div>

      {isConvexConfigured && <SeasonPicker />}

      <nav aria-label="Main" className="flex-1 space-y-1 p-2">
        {ROUTES.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              cn(
                buttonVariants({ variant: isActive ? 'outline' : 'ghost' }),
                'w-full justify-start',
                isActive && 'font-semibold',
              )
            }
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-2">
        <ThemeToggle compact />
      </div>
    </aside>
  )
}
