import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { PlayLog } from '@/features/play-log/play-log'

export function PlayLogPage(): ReactNode {
  const { workspaceId = '', gameId = '' } = useParams()
  return isConvexConfigured ? <PlayLog workspaceId={workspaceId} sourceGameId={gameId} /> : <p className="p-6">Convex is not configured</p>
}
