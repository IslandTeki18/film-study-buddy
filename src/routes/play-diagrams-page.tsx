import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { DiagramGallery } from '@/features/designer/diagram-gallery'

export function PlayDiagramsPage(): ReactNode {
  const { workspaceId = '', gameId = '' } = useParams()
  return isConvexConfigured
    ? <DiagramGallery workspaceId={workspaceId} sourceGameId={gameId} />
    : <p className="p-6">Convex is not configured</p>
}
