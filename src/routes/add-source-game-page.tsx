import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { SourceGameList } from '@/features/workspaces/source-game-list'
import { AddSourceGameDialog } from '@/features/workspaces/add-source-game-dialog'

export function AddSourceGamePage(): ReactNode {
  const { workspaceId = '' } = useParams()
  return isConvexConfigured ? <>
    <SourceGameList workspaceId={workspaceId} />
    <AddSourceGameDialog key={workspaceId} workspaceId={workspaceId} />
  </> : <p className="p-6">Convex is not configured</p>
}
