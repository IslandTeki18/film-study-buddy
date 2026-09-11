import type { ReactNode } from 'react'
import { isConvexConfigured } from '@/convex-client'
import { TemplateList } from '@/features/templates/template-list'

export function TemplatesPage(): ReactNode {
  return isConvexConfigured ? <TemplateList /> : <p className="p-6">Convex is not configured</p>
}
