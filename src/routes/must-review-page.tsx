import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { FocusedReview } from '@/features/review/focused-review'
import { ReviewQueue } from '@/features/review/review-queue'
import { isConvexConfigured } from '@/convex-client'

export function MustReviewPage(): ReactNode {
  const { workspaceId = '', gameId = '', snapId } = useParams()
  if (!isConvexConfigured) return <p className="p-6">Convex is not configured</p>
  return snapId
    ? <FocusedReview workspaceId={workspaceId} sourceGameId={gameId} snapId={snapId} />
    : <ReviewQueue workspaceId={workspaceId} sourceGameId={gameId} />
}
