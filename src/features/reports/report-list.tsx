import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc } from '@convex/_generated/dataModel'
import { playerReportName, REPORT_INTENTS, REPORT_INTENT_LABEL, type ReportIntent } from '@convex/domain/reportBlocks'
import { NameDialog } from '@/components/name-dialog'
import { Button } from '@/components/ui/button'
import { Chip, Meta, Page } from '@/components/ui/panel'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/toast'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'

export function ReportList({ workspaceId }: { readonly workspaceId: string }): ReactNode {
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const reports = useQuery(api.reports.listByWorkspace, { workspaceId })
  const duplicate = useMutation(api.reports.duplicateAsPlayerReport)
  const create = useMutation(api.reports.create)
  const update = useMutation(api.reports.update)
  const remove = useMutation(api.reports.remove).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.reports.listByWorkspace, { workspaceId })
    if (current) store.setQuery(api.reports.listByWorkspace, { workspaceId }, current.filter((item) => item._id !== args.reportId))
  })
  const undo = useMutation(api.deletions.undo)
  const { show } = useToast()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<ReportIntent | Doc<'reports'> | null>(null)
  const deleteReport = useUndoableMutation((report: Doc<'reports'>) => remove({ reportId: report._id }), async (args) => { await undo(args) }, (report) => `Deleted ${report.name}`)
  function failure(verb: string, error: unknown): void {
    show({ message: `Could not ${verb} Report. ${error instanceof Error ? error.message : String(error)}` })
  }
  if (workspace === undefined || reports === undefined) return <div role="status" aria-label="Loading Reports" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!workspace) return <div className="space-y-3 p-6"><h1>Workspace not found</h1><Link className="underline" to="/">Home</Link></div>
  return <Page width="max-w-[900px]">
    <header className="flex flex-wrap items-center gap-3"><h1 className="text-xl font-bold">Reports</h1><Meta>{reports.length} Reports</Meta>
      {REPORT_INTENTS.map((intent) => <Button key={intent} onClick={() => setDialog(intent)}>New {REPORT_INTENT_LABEL[intent]}</Button>)}
    </header>
    {reports.length === 0 ? <p>No Reports yet. Create a Coach Report to start.</p> : <ul className="grid gap-2">
      {reports.map((report) => <li key={report._id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div><Link className="font-semibold hover:underline" to={`/w/${workspaceId}/reports/${report._id}`}>{report.name}</Link> <Chip>{REPORT_INTENT_LABEL[report.intent]}</Chip>
          <Meta className="mt-2 block">{report.blocks.length} blocks · {new Date(report.updatedAt).toLocaleDateString()}</Meta></div>
        <DropdownMenu label="Actions" triggerProps={{ 'aria-label': `Actions for ${report.name}`, variant: 'outline' }} items={[
          { label: 'Open', onSelect: () => { void navigate(`/w/${workspaceId}/reports/${report._id}`) } },
          { label: 'Preview', onSelect: () => { void navigate(`/w/${workspaceId}/reports/${report._id}/preview`) } },
          ...(report.intent === 'coach' ? [{ label: 'Duplicate as Player Report', onSelect: () => {
            void duplicate({ reportId: report._id }).then((id) => { show({ message: `Created ${playerReportName(report.name)}` }); void navigate(`/w/${workspaceId}/reports/${id}`) }).catch((error: unknown) => failure('duplicate', error))
          } }] : []),
          { label: 'Rename', onSelect: () => setDialog(report) },
          { label: 'Delete', onSelect: () => { void deleteReport(report).catch((error: unknown) => failure('delete', error)) } },
        ]} />
      </li>)}
    </ul>}
    <NameDialog open={dialog !== null} title={typeof dialog === 'string' ? `New ${REPORT_INTENT_LABEL[dialog]}` : 'Rename Report'}
      label="Report name" initialValue={typeof dialog === 'object' && dialog ? dialog.name : ''} confirmLabel={typeof dialog === 'string' ? 'Create' : 'Rename'}
      onOpenChange={(open) => { if (!open) setDialog(null) }} onConfirm={async (name) => {
        try {
          if (typeof dialog === 'string') {
            const id = await create({ workspaceId: workspace._id, name, intent: dialog })
            void navigate(`/w/${workspaceId}/reports/${id}`)
          } else if (dialog) await update({ reportId: dialog._id, name })
        } catch (error) { failure(typeof dialog === 'string' ? 'create' : 'rename', error); throw error }
      }} />
  </Page>
}
