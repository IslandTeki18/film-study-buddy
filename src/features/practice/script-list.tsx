import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { NameDialog } from '@/components/name-dialog'
import { Button } from '@/components/ui/button'
import { Meta, Page, Panel } from '@/components/ui/panel'
import { useToast } from '@/components/ui/toast'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'

export function ScriptList({ workspaceId }: { readonly workspaceId: string }): ReactNode {
  const navigate = useNavigate()
  const { show } = useToast()
  const [creating, setCreating] = useState(false)
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const scripts = useQuery(api.practiceScripts.list, { workspaceId })
  const create = useMutation(api.practiceScripts.create)
  const remove = useMutation(api.practiceScripts.remove)
  const undo = useMutation(api.deletions.undo)
  const deleteScript = useUndoableMutation((scriptId: Id<'practiceScripts'>) => remove({ scriptId }), async (args) => { await undo(args) }, () => 'Deleted Practice Script')
  if (workspace === undefined || scripts === undefined) return <div role="status" aria-label="Loading Practice Scripts" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!workspace) return <main className="space-y-3 p-6"><h1>Workspace not found</h1><Link className="underline" to="/">Home</Link></main>
  return <Page width="max-w-[900px]">
    <header className="flex flex-wrap items-center gap-3">
      <h1 className="text-xl font-bold">Practice Scripts</h1><Meta>{scripts.length}</Meta>
      <Button className="ml-auto" onClick={() => setCreating(true)}>New Practice Script</Button>
    </header>
    {scripts.length === 0
      ? <p>No Practice Scripts yet. A script turns this week's Play Diagrams into scout-team reps and printable Scout Cards.</p>
      : <ul className="grid gap-2">{scripts.map((script) => <li key={script._id}><Panel className="flex items-center gap-3 p-3">
          <Link className="font-semibold underline" to={`/w/${workspaceId}/practice/${script._id}`}>{script.name}</Link>
          <Meta>{script.periods.length} periods · {script.periods.reduce((sum, period) => sum + period.reps.length, 0)} reps</Meta>
          <Button className="ml-auto" size="sm" variant="outline" onClick={() => {
            void deleteScript(script._id).catch((error: unknown) => show({ message: `Could not delete Practice Script. ${error instanceof Error ? error.message : String(error)}` }))
          }}>Delete</Button>
        </Panel></li>)}</ul>}
    <NameDialog open={creating} title="New Practice Script" label="Name" initialValue={`Week ${workspace.week} Scout Script`} confirmLabel="Create"
      onOpenChange={setCreating} onConfirm={async (name) => {
        const id = await create({ workspaceId: workspace._id, name })
        void navigate(`/w/${workspaceId}/practice/${id}`)
      }} />
  </Page>
}
