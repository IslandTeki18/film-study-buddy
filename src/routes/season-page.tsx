import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { SeasonView } from '@/features/seasons/season-view'

export function SeasonPage(): ReactNode {
  const { seasonId = '' } = useParams()
  return isConvexConfigured ? <SeasonView seasonId={seasonId} /> : <p className="p-6">Convex is not configured</p>
}
