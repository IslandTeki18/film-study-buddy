import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { Tells } from '@/features/tells/tells'

export function TellsPage(): ReactNode {
  const { workspaceId = '' } = useParams()
  return isConvexConfigured ? <Tells workspaceId={workspaceId} /> : <p className="p-6">Convex is not configured</p>
}
