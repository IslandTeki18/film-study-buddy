import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { Tendencies } from '@/features/tendencies/tendencies'

export function TendenciesPage(): ReactNode {
  const { workspaceId = '' } = useParams()
  return isConvexConfigured ? <Tendencies workspaceId={workspaceId} /> : <p className="p-6">Convex is not configured</p>
}
