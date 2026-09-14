import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { NameDialog } from '@/components/name-dialog'
import type { ColumnLayout } from './use-column-layout'

export function ViewPicker({ templateId, layout, onApply }: {
  readonly templateId: Id<'templates'>; readonly layout: ColumnLayout
  readonly onApply: (view: Pick<Doc<'templateViews'>, '_id' | 'visibleColumns' | 'columnOrder'> | null) => void
}): ReactNode {
  const views = useQuery(api.templates.listViews, { templateId })
  const save = useMutation(api.templates.saveView)
  const [creating, setCreating] = useState(false)
  if (views === undefined) return <span role="status">Loading Play Log Views…</span>
  return <>
    <Select className="w-auto" aria-label="Play Log View" value={views.some((view) => view._id === layout.viewId) ? layout.viewId ?? '' : ''}
      onChange={(event) => onApply(views.find((view) => view._id === event.target.value) ?? null)}>
      <option value="">Custom</option>
      {views.map((view) => <option key={view._id} value={view._id}>{view.name}</option>)}
    </Select>
    <Button variant="outline" onClick={() => setCreating(true)}>Save as view</Button>
    <NameDialog open={creating} onOpenChange={setCreating} title="Save Play Log View" label="Name"
      initialValue="" confirmLabel="Create view" onConfirm={async (name) => {
        const columns = { visibleColumns: layout.visible, columnOrder: layout.order }
        const id = await save({ templateId, name, ...columns })
        onApply({ _id: id, ...columns })
      }} />
  </>
}
