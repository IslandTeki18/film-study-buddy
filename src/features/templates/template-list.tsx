import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/toast'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'
import { NameDialog } from './name-dialog'

type TemplateTarget = { readonly templateId: Id<'templates'>; readonly name: string }

export function TemplateList(): ReactNode {
  const templates = useQuery(api.templates.list, {})
  const create = useMutation(api.templates.create)
  const rename = useMutation(api.templates.rename)
  const duplicate = useMutation(api.templates.duplicate)
  const remove = useMutation(api.templates.remove)
  const undo = useMutation(api.deletions.undo)
  const { show } = useToast()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<'create' | TemplateTarget | null>(null)
  const deleteTemplate = useUndoableMutation(
    (target: TemplateTarget) => remove({ templateId: target.templateId }),
    async (args) => { await undo(args) },
    (target) => `Deleted ${target.name}`,
  )
  function report(verb: string, error: unknown): void {
    show({ message: `Could not ${verb} template. ${error instanceof Error ? error.message : String(error)}` })
  }
  return <main className="space-y-6 p-6">
    <header className="flex items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold">Coaching Templates</h1>
      <Button onClick={() => setDialog('create')}>New template</Button>
    </header>
    {templates === undefined ? <div aria-label="Loading Coaching Templates" role="status" className="space-y-3">
      {[0, 1, 2].map((row) => <div key={row} className="h-16 animate-pulse rounded-md bg-muted" />)}
    </div> : templates.length === 0 ? <p className="text-muted-foreground">No Coaching Templates yet</p> :
      <ul className="divide-y divide-border rounded-md border border-border">
        {templates.map((template) => <li key={template._id} className="flex items-center justify-between gap-4 p-4">
          <div>
            <Link className="font-medium underline-offset-4 hover:underline" to={`/templates/${template._id}`}>{template.name}</Link>
            {template.isStarter && <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs">Starter</span>}
            <p className="text-sm text-muted-foreground">{template.coachingArea}</p>
          </div>
          <DropdownMenu label="Actions" triggerProps={{ 'aria-label': `Actions for ${template.name}`, variant: 'outline' }} items={[
            { label: 'Rename', onSelect: () => setDialog({ templateId: template._id, name: template.name }) },
            { label: 'Duplicate', onSelect: () => { void duplicate({ templateId: template._id })
              .then(() => show({ message: `Duplicated ${template.name}` })).catch((error: unknown) => report('duplicate', error)) } },
            { label: 'Delete', onSelect: () => { void deleteTemplate({ templateId: template._id, name: template.name })
              .catch((error: unknown) => report('delete', error)) } },
          ]} />
        </li>)}
      </ul>}
    <NameDialog open={dialog !== null} title={dialog === 'create' ? 'New Coaching Template' : 'Rename Coaching Template'}
      label="Template name" initialValue={typeof dialog === 'object' && dialog ? dialog.name : ''}
      confirmLabel={dialog === 'create' ? 'Create' : 'Rename'} onOpenChange={(open) => { if (!open) setDialog(null) }}
      onConfirm={async (name) => {
        try {
          if (dialog === 'create') {
            const id = await create({ name })
            void navigate(`/templates/${id}`)
          } else if (dialog) await rename({ templateId: dialog.templateId, name })
        } catch (error) {
          report(dialog === 'create' ? 'create' : 'rename', error)
          throw error
        }
      }} />
  </main>
}
