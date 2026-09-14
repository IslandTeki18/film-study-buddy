import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Meta } from '@/components/ui/panel'

export const HOME_NAV = [
  { path: '/templates', label: 'Coaching templates' },
  { path: '/settings', label: 'Settings' },
  { path: '/archive', label: 'Archived opponents' },
] as const

export function Brand({ size = 'sm' }: { readonly size?: 'sm' | 'lg' }): ReactNode {
  return <span aria-hidden="true" className={cn('flex items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground',
    size === 'lg' ? 'size-9 text-[15px]' : 'size-[30px] text-[13px]')}>FR</span>
}

/**
 * Top bar shared by every non-workspace screen. Home shows the brand and the section nav;
 * other screens show a Home link and their title. Doubles as the Electron drag region.
 */
export function AppHeader({ title, meta, children }: {
  readonly title?: string; readonly meta?: ReactNode; readonly children?: ReactNode
}): ReactNode {
  return <header className="app-drag-region flex flex-wrap items-center gap-4 border-b border-border bg-card px-6 pt-4 pb-3 pl-24">
    {title ? <>
      <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to="/">← Home</Link>
      <span className="text-[15px] font-semibold tracking-tight">{title}</span>
    </> : <>
      <Brand />
      <span className="text-[15px] font-semibold tracking-tight">Film Room</span>
    </>}
    {meta && <Meta className="border-l border-border-strong pl-4">{meta}</Meta>}
    {children}
    {!title && <nav aria-label="Main" className="ml-auto flex flex-wrap gap-2">
      {HOME_NAV.map(({ path, label }) => <NavLink key={path} to={path}
        className={({ isActive }) => cn(buttonVariants({ variant: 'outline', size: 'sm' }), isActive && 'text-foreground')}>
        {label}
      </NavLink>)}
    </nav>}
  </header>
}
