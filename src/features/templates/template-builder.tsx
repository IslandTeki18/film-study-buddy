import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { InlineName } from './inline-name'
import { SectionList } from './section-list'

export function TemplateBuilder({ templateId }: { readonly templateId: string }): ReactNode {
  const tree = useQuery(api.templates.getFull, { templateId })
  const rename = useMutation(api.templates.rename)
  if (tree === undefined) return <div role="status" aria-label="Loading Coaching Template" className="m-6 h-48 animate-pulse rounded-md bg-muted" />
  if (tree === null) return <main className="space-y-4 p-6">
    <h1 className="text-2xl font-semibold">Coaching Template not found</h1>
    <Link className="underline" to="/templates">Back to Coaching Templates</Link>
  </main>
  return <main className="space-y-6 p-6">
    <Link className="text-sm underline" to="/templates">Back to Coaching Templates</Link>
    <header className="space-y-2">
      <h1 className="text-2xl font-semibold">Template Builder</h1>
      <InlineName key={tree.template._id} label="Template name" value={tree.template.name}
        save={async (name) => { await rename({ templateId: tree.template._id, name }) }} />
    </header>
    <SectionList key={tree.template._id} tree={tree} />
  </main>
}
