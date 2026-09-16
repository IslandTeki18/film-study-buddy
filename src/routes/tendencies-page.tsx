import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { isConvexConfigured } from '@/convex-client'
import { Page } from '@/components/ui/panel'
import { TendencyCard } from '@/features/tendencies/tendency-card'

function TendencyFields({ workspaceId }: { readonly workspaceId: string }): ReactNode {
  const tendencies = useQuery(api.tendencies.listByWorkspace, { workspaceId })
  const diagrams = useQuery(api.diagrams.listByWorkspace, { workspaceId })
  return <Page><h1>Tendencies / Alerts</h1>{tendencies && diagrams ? tendencies.map((tendency) => <TendencyCard key={tendency._id} tendency={tendency} diagrams={diagrams} onDelete={() => undefined} />) : <p role="status">Loading…</p>}</Page>
}

export function TendenciesPage(): ReactNode {
  const { workspaceId = '' } = useParams()
  return isConvexConfigured ? <TendencyFields workspaceId={workspaceId} /> : <p className="p-6">Convex is not configured</p>
}
