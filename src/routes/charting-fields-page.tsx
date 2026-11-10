import type { ReactNode } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { isConvexConfigured } from '@/convex-client'
import { TemplateBuilder } from '@/features/templates/template-builder'

/** The defensive line charting fields: the single Coaching Template every Source Game uses. */
export function ChartingFieldsPage(): ReactNode {
  return isConvexConfigured ? <PrimaryTemplate /> : <p className="p-6">Convex is not configured</p>
}

function PrimaryTemplate(): ReactNode {
  const templateId = useQuery(api.templates.primary, {})
  if (templateId === undefined) return <div role="status" aria-label="Loading charting fields" className="m-6 h-48 animate-pulse rounded-md bg-muted" />
  return <TemplateBuilder templateId={templateId ?? ''} />
}
