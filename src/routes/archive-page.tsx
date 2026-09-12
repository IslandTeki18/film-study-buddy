import type { ReactNode } from 'react'
import { isConvexConfigured } from '@/convex-client'
import { ArchivedOpponents } from '@/features/workspaces/archived-opponents'

export function ArchivePage(): ReactNode {
  return isConvexConfigured ? <ArchivedOpponents /> : <p className="p-6">Convex is not configured</p>
}
