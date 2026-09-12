import type { ReactNode } from 'react'
import { isConvexConfigured } from '@/convex-client'
import { HomeScreen } from '@/features/workspaces/home-screen'

export function HomePage(): ReactNode {
  return isConvexConfigured ? <HomeScreen /> : <p className="p-6">Convex is not configured</p>
}
