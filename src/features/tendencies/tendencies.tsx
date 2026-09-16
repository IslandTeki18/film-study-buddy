import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Meta, Page } from '@/components/ui/panel'
import { useToast } from '@/components/ui/toast'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'
import { TendencyCard } from './tendency-card'

export function Tendencies({ workspaceId }: { readonly workspaceId: string }): ReactNode {
  const { show } = useToast()
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const tendencies = useQuery(api.tendencies.listByWorkspace, { workspaceId })
  const categories = useQuery(api.tendencies.listCategories, {})
  const diagrams = useQuery(api.diagrams.listByWorkspace, { workspaceId })
  const remove = useMutation(api.tendencies.remove).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.tendencies.listByWorkspace, { workspaceId })
    if (current) store.setQuery(api.tendencies.listByWorkspace, { workspaceId }, current.filter((item) => item._id !== args.tendencyId))
  })
  const undo = useMutation(api.deletions.undo)
  const deleteTendency = useUndoableMutation((tendencyId: Id<'tendencies'>) => remove({ tendencyId }), async (args) => { await undo(args) }, () => 'Deleted Tendency / Alert')
  if (workspace === undefined || tendencies === undefined || categories === undefined || diagrams === undefined) return <div role="status" aria-label="Loading Tendencies" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!workspace) return <main className="space-y-3 p-6"><h1>Workspace not found</h1><Link className="underline" to="/">Home</Link></main>
  const order = [...categories, ...[...new Set(tendencies.map((tendency) => tendency.category))].filter((category) => !categories.includes(category)).sort((a, b) => a.localeCompare(b))]
  return <Page width="max-w-[900px]">
    <header className="flex flex-wrap items-center gap-3"><h1 className="text-xl font-bold">Tendencies / Alerts</h1><Meta>{tendencies.length} Tendencies / Alerts</Meta></header>
    {tendencies.length === 0 ? <p>No Tendencies / Alerts yet. Create one from a result in <Link className="underline" to={`/w/${workspaceId}/data`}>Opponent Data</Link>.</p> : order.map((category) => {
      const items = tendencies.filter((tendency) => tendency.category === category)
      return items.length > 0 && <section key={category} className="grid gap-3" aria-label={category}>
        <h2 className="font-semibold">{category} <Meta>{items.length}</Meta></h2>
        {items.map((tendency) => <TendencyCard key={tendency._id} tendency={tendency} diagrams={diagrams} onDelete={() => {
          void deleteTendency(tendency._id).catch((error: unknown) => show({ message: `Could not delete Tendency / Alert. ${error instanceof Error ? error.message : String(error)}` }))
        }} />)}
      </section>
    })}
  </Page>
}
