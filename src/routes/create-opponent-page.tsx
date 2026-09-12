import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { SeasonView } from '@/features/seasons/season-view'
import { CreateOpponentDialog } from '@/features/workspaces/create-opponent-dialog'

export function CreateOpponentPage(): ReactNode {
  const { seasonId = '' } = useParams()
  return isConvexConfigured ? <>
    <SeasonView seasonId={seasonId} />
    <CreateOpponentDialog key={seasonId} seasonId={seasonId} />
  </> : <p className="p-6">Convex is not configured</p>
}
