import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { TemplateBuilder } from '@/features/templates/template-builder'

export function TemplateBuilderPage(): ReactNode {
  const { templateId = '' } = useParams()
  return isConvexConfigured ? <TemplateBuilder templateId={templateId} /> :
    <p className="p-6">Convex is not configured</p>
}
