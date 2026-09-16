import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { isConvexConfigured } from '@/convex-client'
import { ReportList } from '@/features/reports/report-list'

export function ReportListPage(): ReactNode {
  const { workspaceId = '' } = useParams()
  return isConvexConfigured ? <ReportList workspaceId={workspaceId} /> : <p className="p-6">Convex is not configured</p>
}
