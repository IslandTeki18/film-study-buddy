import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { PlayDetail } from '@/features/play-log/play-detail'
import { isConvexConfigured } from '@/convex-client'

export function PlayDetailPage(): ReactNode {
  const { workspaceId = '', gameId = '', snapId = '' } = useParams()
  if (!isConvexConfigured) return <p className="p-6">Convex is not configured</p>
  return <PlayDetail workspaceId={workspaceId} sourceGameId={gameId} snapId={snapId} />
}
