import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { ReportPreview } from '@/features/reports/report-preview'

export function ReportPreviewPage(): ReactNode {
  const { workspaceId = '', reportId = '' } = useParams()
  return isConvexConfigured ? <ReportPreview workspaceId={workspaceId} reportId={reportId} /> : <p className="p-6">Convex is not configured</p>
}
