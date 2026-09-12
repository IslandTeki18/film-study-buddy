import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { WorkspaceOverview } from '@/features/workspaces/workspace-overview'

export function WorkspaceOverviewPage(): ReactNode {
  const { workspaceId = '' } = useParams()
  return isConvexConfigured ? <WorkspaceOverview key={workspaceId} workspaceId={workspaceId} /> : <p className="p-6">Convex is not configured</p>
}
