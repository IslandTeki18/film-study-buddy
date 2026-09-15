import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { PlayDesigner } from '@/features/designer/play-designer'

export function PlayDesignerPage(): ReactNode {
  const { workspaceId = '', gameId = '', diagramId = '' } = useParams()
  return isConvexConfigured
    ? <PlayDesigner workspaceId={workspaceId} sourceGameId={gameId} diagramId={diagramId} />
    : <p className="p-6">Convex is not configured</p>
}
