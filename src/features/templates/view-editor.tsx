import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { getCoreField, isCoreFieldKey } from '@convex/domain/coreFields'
import { columnCatalog, fieldColumnKey, reconcileView, type ColumnKey } from '@convex/domain/templateFields'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useReorder } from '@/lib/reorder'
import { cn } from '@/lib/utils'
import { InlineName } from './inline-name'
import { moved, type TemplateTree } from './section-list'

export function ViewEditor({ tree }: { readonly tree: TemplateTree }): ReactNode {
  const templateId = tree.template._id
  const views = useQuery(api.templates.listViews, { templateId })
  const save = useMutation(api.templates.saveView)
  const { show } = useToast()
  const [selectedId, setSelectedId] = useState<Id<'templateViews'> | null>(null)
  const [pending, setPending] = useState(false)
  const selected = views?.find((view) => view._id === selectedId)
  return <section aria-label="Play Log Views" className="space-y-4 rounded-md border border-border p-4">
    <header className="flex items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">Play Log Views</h2>
      <Button variant="outline" size="sm" disabled={pending} onClick={() => {
        const columns = columnCatalog(tree.sections.flatMap((section) => section.fields.map((field) => field._id)))
        setPending(true)
        void save({ templateId, name: 'New view', visibleColumns: columns, columnOrder: columns })
          .then(setSelectedId).catch((error: unknown) => {
            show({ message: `Could not create view. ${error instanceof Error ? error.message : String(error)}` })
          }).finally(() => setPending(false))
      }}>New view</Button>
    </header>
    {views === undefined ? <div role="status" aria-label="Loading Play Log Views" className="h-12 animate-pulse rounded bg-muted" /> :
      views.length === 0 ? <p className="text-sm text-muted-foreground">No Play Log Views yet</p> :
        <label className="block space-y-1 text-sm">
          <span>Play Log View</span>
          <Select value={selected?._id ?? ''} onChange={(event) => {
            setSelectedId(views.find((view) => view._id === event.target.value)?._id ?? null)
          }}>
            <option value="">Choose a view</option>
            {views.map((view) => <option key={view._id} value={view._id}>{view.name}</option>)}
          </Select>
        </label>}
    {selected && <ViewColumns key={selected._id} view={selected} tree={tree} onDeleted={() => setSelectedId(null)} />}
  </section>
}

function ViewColumns({ view, tree, onDeleted }: {
  readonly view: Doc<'templateViews'>
  readonly tree: TemplateTree
  readonly onDeleted: () => void
}): ReactNode {
  const save = useMutation(api.templates.saveView).withOptimisticUpdate((store, args) => {
    const views = store.getQuery(api.templates.listViews, { templateId: args.templateId })
    if (!views || !args.viewId) return
    store.setQuery(api.templates.listViews, { templateId: args.templateId }, views.map((view) =>
      view._id === args.viewId ? { ...view, name: args.name, visibleColumns: args.visibleColumns, columnOrder: args.columnOrder } : view)
      .sort((a, b) => a.name.localeCompare(b.name)))
  })
  const remove = useMutation(api.templates.removeView)
  const { show } = useToast()
  const [pending, setPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const fields = tree.sections.flatMap((section) => section.fields)
  const catalog = columnCatalog(fields.map((field) => field._id))
  const columns = reconcileView(view, catalog)
  const labels = new Map(fields.map((field) => [fieldColumnKey(field._id), field.name]))
  function label(key: ColumnKey): string {
    const core = key.slice(5)
    return key.startsWith('core:') && isCoreFieldKey(core) ? getCoreField(core).label : labels.get(key) ?? key
  }
  function report(error: unknown): void {
    show({ message: `Could not update view. ${error instanceof Error ? error.message : String(error)}` })
  }
  async function persist(patch: { name?: string; visibleColumns?: ColumnKey[]; columnOrder?: ColumnKey[] }): Promise<void> {
    setPending(true)
    try {
      await save({ templateId: view.templateId, viewId: view._id, name: view.name, ...columns, ...patch })
    } finally {
      setPending(false)
    }
  }
  const drag = useReorder({
    itemCount: columns.columnOrder.length,
    label: (index) => { const key = columns.columnOrder[index]; return key ? label(key) : 'Column' },
    onReorder: (from, to) => { void persist({ columnOrder: moved(columns.columnOrder, from, to) }).catch(report) },
  })
  return <div className="space-y-3">
    <InlineName label="View name" value={view.name} save={async (name) => {
      try { await persist({ name }) } catch (error) { report(error); throw error }
    }} />
    <fieldset disabled={pending} className="space-y-1">
      <legend className="mb-2 text-sm font-medium">Visible columns and order</legend>
      {columns.columnOrder.map((key, index) => <div key={key}
        className={cn('flex flex-wrap items-center gap-2 rounded border border-border p-2', drag.dragOverIndex === index && 'border-primary')}>
        <Button size="sm" variant="ghost" aria-label={`Drag column ${label(key)}`} {...drag.getItemProps(index)}>⠿</Button>
        <span className="min-w-24 flex-1"><Checkbox label={label(key)} checked={columns.visibleColumns.includes(key)}
          onChange={(event) => { void persist({ visibleColumns: event.target.checked ? [...columns.visibleColumns, key] :
            columns.visibleColumns.filter((column) => column !== key) }).catch(report) }} /></span>
        <Button size="sm" variant="ghost" aria-label={`Move column ${label(key)} up`} disabled={!drag.canMoveUp(index)}
          onClick={() => drag.moveUp(index)}>Move up</Button>
        <Button size="sm" variant="ghost" aria-label={`Move column ${label(key)} down`} disabled={!drag.canMoveDown(index)}
          onClick={() => drag.moveDown(index)}>Move down</Button>
      </div>)}
    </fieldset>
    <p className="sr-only" aria-live="polite">{drag.announcement}</p>
    <Button variant="outline" onClick={() => { setDeleteError(''); setConfirmDelete(true) }}>Delete view</Button>
    <Dialog open={confirmDelete} onOpenChange={setConfirmDelete} aria-label={`Delete view ${view.name}?`}>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Delete view {view.name}?</h2>
        <p>This cannot be undone.</p>
        {deleteError && <p role="alert" className="text-sm text-red-600">{deleteError}</p>}
        <div className="flex justify-end gap-2">
          <Button autoFocus variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button disabled={pending} onClick={() => {
            if (pending) return
            setPending(true)
            void remove({ viewId: view._id }).then(() => { setConfirmDelete(false); onDeleted() })
              .catch((error: unknown) => { setDeleteError(error instanceof Error ? error.message : String(error)) })
              .finally(() => setPending(false))
          }}>Delete view</Button>
        </div>
      </div>
    </Dialog>
  </div>
}
