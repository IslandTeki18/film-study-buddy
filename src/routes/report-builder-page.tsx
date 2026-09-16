import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { ReportBuilder } from '@/features/reports/report-builder'

export function ReportBuilderPage(): ReactNode {
  const { workspaceId = '', reportId = '' } = useParams()
  return isConvexConfigured ? <ReportBuilder workspaceId={workspaceId} reportId={reportId} /> : <p className="p-6">Convex is not configured</p>
}
