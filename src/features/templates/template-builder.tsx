import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { AppHeader } from '@/components/app-header'
import { ViewEditor } from './view-editor'
import { FieldEditor } from './field-editor'
import { SectionList } from './section-list'

export function TemplateBuilder({ templateId }: { readonly templateId: string }): ReactNode {
  const tree = useQuery(api.templates.getFull, { templateId })
  const [selectedFieldId, setSelectedFieldId] = useState<Id<'templateFields'> | null>(null)
  const selectedField = tree?.sections.flatMap((section) => section.fields)
    .find((field) => field._id === selectedFieldId)
  useEffect(() => {
    if (tree !== undefined && selectedFieldId && !selectedField) setSelectedFieldId(null)
  }, [tree, selectedFieldId, selectedField])
  if (tree === undefined) return <div role="status" aria-label="Loading Coaching Template" className="m-6 h-48 animate-pulse rounded-md bg-muted" />
  if (tree === null) return <main className="space-y-4 p-6">
    <h1 className="text-2xl font-semibold">Charting fields not found</h1>
    <p className="text-sm text-muted-foreground">Add a Source Game and the Defensive Line template is reinstalled.</p>
    <Link className="underline" to="/">Back to Home</Link>
  </main>
  return <>
    <AppHeader title="DL charting fields" meta="What you chart on every Snap, beyond down, distance and formation" />
    <main className="space-y-6 p-6">
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <div className="space-y-6">
        <SectionList key={tree.template._id} tree={tree} selectedFieldId={selectedFieldId} onSelectField={setSelectedFieldId} />
        <ViewEditor key={tree.template._id} tree={tree} />
      </div>
      {selectedField ? <FieldEditor key={selectedField._id} field={selectedField} /> :
        <p className="text-sm text-muted-foreground">Select a field to edit it</p>}
    </div>
  </main>
  </>
}
