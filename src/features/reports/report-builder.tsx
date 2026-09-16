import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { REPORT_INTENT_LABEL } from '@convex/domain/reportBlocks'
import { Chip, Page, Panel } from '@/components/ui/panel'
import { ReportBlockView } from './report-block-view'

export function ReportBuilder({ workspaceId, reportId }: { readonly workspaceId: string; readonly reportId: string }): ReactNode {
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const report = useQuery(api.reports.get, { workspaceId, reportId })
  if (workspace === undefined || report === undefined) return <div role="status" aria-label="Loading Report" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!workspace || !report) return <div className="space-y-3 p-6"><h1>Report not found</h1><Link className="underline" to={`/w/${workspaceId}/reports`}>Reports</Link></div>
  return <Page width="max-w-[900px]">
    <header className="flex flex-wrap items-center gap-3"><Link className="underline" to={`/w/${workspaceId}/reports`}>Reports</Link><h1 className="text-xl font-bold">{report.name}</h1><Chip>{REPORT_INTENT_LABEL[report.intent]}</Chip><Link className="underline" to={`/w/${workspaceId}/reports/${reportId}/preview`}>Preview</Link></header>
    {report.blocks.length === 0 ? <p>No blocks yet.</p> : report.blocks.map((block) => <Panel key={block.id} className="p-4"><ReportBlockView block={block} showClipReferences={report.showClipReferences} mode="builder" /></Panel>)}
  </Page>
}
