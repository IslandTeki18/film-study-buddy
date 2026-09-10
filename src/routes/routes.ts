import { Clapperboard, Settings, type LucideIcon } from 'lucide-react'

export const ROUTES = [
  { id: 'home', label: 'Film Room', Icon: Clapperboard },
  { id: 'settings', label: 'Settings', Icon: Settings },
] as const satisfies ReadonlyArray<{ id: string; label: string; Icon: LucideIcon }>

export type RouteId = (typeof ROUTES)[number]['id']
export const DEFAULT_ROUTE: RouteId = 'home'
