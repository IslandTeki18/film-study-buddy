import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { BLOCK_TYPE_LABEL, REPORT_INTENT_LABEL, type BlockType } from '@convex/domain/reportBlocks'
import { Chip, Page, Panel } from '@/components/ui/panel'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/toast'
import { DataTableDialog, TendencyDialog, DiagramDialog, SelectedPlaysDialog, QuickNotesDialog } from './insert-block-dialogs'
import { ReportBlockView } from './report-block-view'

export function ReportBuilder({ workspaceId, reportId }: { readonly workspaceId: string; readonly reportId: string }): ReactNode {
  const { show } = useToast()
  const insert = useMutation(api.reports.insertBlock)
  const [picker, setPicker] = useState<BlockType | null>(null)
  const [pending, setPending] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  const blocksRef = useRef<HTMLDivElement>(null)
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const report = useQuery(api.reports.get, { workspaceId, reportId })
  useEffect(() => {
    if (!focusId) return
    const element = blocksRef.current?.querySelector<HTMLElement>(`[data-block-id="${focusId}"]`)
    if (element) { (element.querySelector<HTMLElement>('input, textarea') ?? element).focus(); setFocusId(null) }
  }, [focusId, report])
  const Picker = picker === 'dataTable' ? DataTableDialog : picker === 'tendency' ? TendencyDialog : picker === 'diagram' ? DiagramDialog : picker === 'selectedPlays' ? SelectedPlaysDialog : picker === 'quickNotes' ? QuickNotesDialog : null
  if (workspace === undefined || report === undefined) return <div role="status" aria-label="Loading Report" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!workspace || !report) return <div className="space-y-3 p-6"><h1>Report not found</h1><Link className="underline" to={`/w/${workspaceId}/reports`}>Reports</Link></div>
  return <Page width="max-w-[900px]">
    <header className="flex flex-wrap items-center gap-3"><Link className="underline" to={`/w/${workspaceId}/reports`}>Reports</Link><h1 className="text-xl font-bold">{report.name}</h1><Chip>{REPORT_INTENT_LABEL[report.intent]}</Chip><Link className="underline" to={`/w/${workspaceId}/reports/${reportId}/preview`}>Preview</Link></header>
    <DropdownMenu label="Add block" triggerProps={{ disabled: pending }} items={(Object.keys(BLOCK_TYPE_LABEL) as BlockType[]).map((type) => ({ label: BLOCK_TYPE_LABEL[type], onSelect: () => {
      if (type !== 'heading' && type !== 'text') { setPicker(type); return }
      setPending(true)
      void insert({ reportId: report._id, source: { type } }).then(setFocusId).catch((error: unknown) => show({ message: `Could not add block. ${error instanceof Error ? error.message : String(error)}` })).finally(() => setPending(false))
    } }))} />
    {Picker && <Picker workspaceId={workspaceId} reportId={report._id} onClose={() => setPicker(null)} onInserted={setFocusId} />}
    <div ref={blocksRef} className="space-y-4">{report.blocks.length === 0 ? <p>No blocks yet.</p> : report.blocks.map((block) => <Panel key={block.id} data-block-id={block.id} tabIndex={-1} className="p-4"><ReportBlockView block={block} showClipReferences={report.showClipReferences} mode="builder" /></Panel>)}</div>
  </Page>
}
