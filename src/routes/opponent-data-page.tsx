import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { OpponentData } from '@/features/opponent-data/opponent-data'

export function OpponentDataPage(): ReactNode {
  const { workspaceId = '' } = useParams()
  return isConvexConfigured ? <OpponentData workspaceId={workspaceId} /> : <p className="p-6">Convex is not configured</p>
}
