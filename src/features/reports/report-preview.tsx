import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { REPORT_INTENT_LABEL } from '@convex/domain/reportBlocks'
import { Button } from '@/components/ui/button'
import { ReportBlockView } from './report-block-view'

export function ReportPreview({ workspaceId, reportId }: { readonly workspaceId: string; readonly reportId: string }): ReactNode {
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const report = useQuery(api.reports.get, { workspaceId, reportId })
  if (workspace === undefined || report === undefined) return <div role="status" aria-label="Loading Report Preview" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!workspace || !report) return <div className="space-y-3 p-6"><h1>Report not found</h1><Link className="underline" to={`/w/${workspaceId}/reports`}>Reports</Link></div>
  return <>
    <div className="flex flex-wrap items-center gap-4 px-6 pt-6 print:hidden"><Link className="underline" to={`/w/${workspaceId}/reports/${reportId}`}>Back to Builder</Link><Button disabled>Export PDF</Button></div>
    <article data-report-ready className="report-sheet mx-auto my-6 w-[8.5in] shrink-0 space-y-6 p-[0.5in] shadow print:m-0 print:w-auto print:p-0 print:shadow-none">
      <header className="report-avoid-break space-y-2 border-b border-border pb-4"><h1 className="text-2xl font-bold">{report.name}</h1><p>{REPORT_INTENT_LABEL[report.intent]}</p><p className="text-sm">{workspace.opponentName} · Week {workspace.week} · {workspace.seasonName}{workspace.gameDate && ` · ${workspace.gameDate}`}</p></header>
      {report.blocks.filter((block) => (block.type !== 'heading' && block.type !== 'text') || block.text.trim()).map((block) => <div key={block.id} className={block.type === 'heading' ? 'report-heading' : undefined}><ReportBlockView block={block} showClipReferences={report.showClipReferences} mode="print" /></div>)}
    </article>
  </>
}
