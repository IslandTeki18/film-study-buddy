import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { AppHeader } from '@/components/app-header'
import { buttonVariants } from '@/components/ui/button'
import { ViewEditor } from './view-editor'
import { FieldEditor } from './field-editor'
import { InlineName } from './inline-name'
import { SectionList } from './section-list'

export function TemplateBuilder({ templateId }: { readonly templateId: string }): ReactNode {
  const tree = useQuery(api.templates.getFull, { templateId })
  const [selectedFieldId, setSelectedFieldId] = useState<Id<'templateFields'> | null>(null)
  const selectedField = tree?.sections.flatMap((section) => section.fields)
    .find((field) => field._id === selectedFieldId)
  useEffect(() => {
    if (tree !== undefined && selectedFieldId && !selectedField) setSelectedFieldId(null)
  }, [tree, selectedFieldId, selectedField])
  const rename = useMutation(api.templates.rename)
  if (tree === undefined) return <div role="status" aria-label="Loading Coaching Template" className="m-6 h-48 animate-pulse rounded-md bg-muted" />
  if (tree === null) return <main className="space-y-4 p-6">
    <h1 className="text-2xl font-semibold">Coaching Template not found</h1>
    <Link className="underline" to="/templates">Back to Coaching Templates</Link>
  </main>
  return <>
    <AppHeader title="Template builder">
      <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to="/templates">All templates</Link>
      <InlineName key={tree.template._id} label="Template name" value={tree.template.name}
        save={async (name) => { await rename({ templateId: tree.template._id, name }) }} />
    </AppHeader>
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
