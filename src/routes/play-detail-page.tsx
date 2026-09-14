import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { PlayDetail } from '@/features/play-log/play-detail'

export function PlayDetailPage(): ReactNode {
  const { workspaceId = '', gameId = '', snapId = '' } = useParams()
  return <PlayDetail workspaceId={workspaceId} sourceGameId={gameId} snapId={snapId} />
}
