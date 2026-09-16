import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc } from '@convex/_generated/dataModel'
import { HEADING_MAX_LENGTH, TEXT_BLOCK_MAX_LENGTH, CAPTION_MAX_LENGTH, TABLE_TITLE_MAX_LENGTH, BLOCK_TYPE_LABEL, REPORT_INTENT_LABEL, type BlockType } from '@convex/domain/reportBlocks'
import { Chip, Meta, Page, Panel } from '@/components/ui/panel'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/toast'
import { DataTableDialog, TendencyDialog, DiagramDialog, SelectedPlaysDialog, QuickNotesDialog } from './insert-block-dialogs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAutosave } from '@/lib/db/use-autosave'
import { useReorder } from '@/lib/reorder'
import { ReportBlockView, type ReportBlock } from './report-block-view'

export function ReportBuilder({ workspaceId, reportId }: { readonly workspaceId: string; readonly reportId: string }): ReactNode {
  const { show } = useToast()
  const insert = useMutation(api.reports.insertBlock)
  const [picker, setPicker] = useState<BlockType | null>(null)
  const [pending, setPending] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  const blocksRef = useRef<HTMLDivElement>(null)
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const report = useQuery(api.reports.get, { workspaceId, reportId })
  const reorder = useMutation(api.reports.reorderBlocks).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.reports.get, { workspaceId, reportId })
    if (current) store.setQuery(api.reports.get, { workspaceId, reportId }, { ...current, blocks: args.blockIds.flatMap((id) => current.blocks.find((block) => block.id === id) ?? []) })
  })
  const remove = useMutation(api.reports.removeBlock).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.reports.get, { workspaceId, reportId })
    if (current) store.setQuery(api.reports.get, { workspaceId, reportId }, { ...current, blocks: current.blocks.filter((block) => block.id !== args.blockId) })
  })
  const restore = useMutation(api.reports.restoreBlock)
  const failure = (error: unknown): void => show({ message: `Could not update Report. ${error instanceof Error ? error.message : String(error)}` })
  const drag = useReorder({
    itemCount: report?.blocks.length ?? 0,
    label: (index) => BLOCK_TYPE_LABEL[report!.blocks[index]!.type],
    onReorder: (from, to) => {
      if (!report) return
      const ids = report.blocks.map((block) => block.id)
      ids.splice(to, 0, ids.splice(from, 1)[0]!)
      void reorder({ reportId: report._id, blockIds: ids }).catch(failure)
    },
  })
  async function deleteBlock(block: ReportBlock): Promise<void> {
    if (!report) return
    try {
      const removed = await remove({ reportId: report._id, blockId: block.id })
      let used = false
      show({ message: `Deleted ${BLOCK_TYPE_LABEL[block.type]} block`, action: { label: 'Undo', onAction: () => {
        if (used) return
        used = true
        void restore({ reportId: report._id, ...removed }).catch(failure)
      } } })
    } catch (error) { failure(error) }
  }
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
    <div ref={blocksRef} className="space-y-4">{report.blocks.length === 0 ? <p>No blocks yet.</p> : report.blocks.map((block, index) => <Panel key={`${report._id}:${block.id}`} data-block-id={block.id} tabIndex={-1} className={`space-y-3 p-4 ${drag.dragOverIndex === index ? 'border-primary' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" aria-label={`Drag ${BLOCK_TYPE_LABEL[block.type]}`} {...drag.getItemProps(index)}>⠿</Button>
        <Meta>{BLOCK_TYPE_LABEL[block.type]}</Meta>
        <Button variant="ghost" size="sm" aria-label={`Move ${BLOCK_TYPE_LABEL[block.type]} up`} disabled={!drag.canMoveUp(index)} onClick={() => drag.moveUp(index)}>Move up</Button>
        <Button variant="ghost" size="sm" aria-label={`Move ${BLOCK_TYPE_LABEL[block.type]} down`} disabled={!drag.canMoveDown(index)} onClick={() => drag.moveDown(index)}>Move down</Button>
      </div>
      <BlockEditor report={report} block={block} onDelete={() => deleteBlock(block)} />
    </Panel>)}</div>
    <p className="sr-only" aria-live="polite">{drag.announcement}</p>
  </Page>
}

function BlockEditor({ report, block, onDelete }: {
  readonly report: Doc<'reports'>
  readonly block: ReportBlock
  readonly onDelete: () => Promise<void>
}): ReactNode {
  const update = useMutation(api.reports.updateBlockText)
  const value = block.type === 'heading' || block.type === 'text' ? block.text : block.type === 'diagram' ? block.caption ?? '' : block.type === 'dataTable' ? block.title : ''
  const editable = block.type === 'heading' || block.type === 'text' || block.type === 'diagram' || block.type === 'dataTable'
  const text = useAutosave(value, async (value) => { await update({ reportId: report._id, blockId: block.id, value }) })
  const maxLength = block.type === 'heading' ? HEADING_MAX_LENGTH : block.type === 'text' ? TEXT_BLOCK_MAX_LENGTH : block.type === 'diagram' ? CAPTION_MAX_LENGTH : TABLE_TITLE_MAX_LENGTH
  const label = block.type === 'diagram' ? 'Caption' : block.type === 'dataTable' ? 'Title' : BLOCK_TYPE_LABEL[block.type]
  const input = { 'aria-label': label, maxLength, value: text.draft, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => text.setDraft(event.target.value), onBlur: text.flush }
  return <>
    {editable && <div className="space-y-1"><label className="block"><span>{label}</span>{block.type === 'text' ? <Textarea {...input} /> : <Input {...input} />}</label>
      {text.status !== 'idle' && <Meta role="status">{text.status === 'error' ? <>Save failed <Button variant="ghost" size="sm" onClick={text.flush}>Retry</Button></> : 'Saving…'}</Meta>}
    </div>}
    {block.type !== 'heading' && block.type !== 'text' && <ReportBlockView block={block} showClipReferences={report.showClipReferences} mode="builder" />}
    <Button data-delete-block variant="ghost" size="sm" onClick={() => { void text.discard().then(onDelete) }}>Delete</Button>
  </>
}
