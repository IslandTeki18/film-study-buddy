import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { AppHeader } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import { Meta, Page } from '@/components/ui/panel'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/toast'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import { NameDialog } from '@/components/name-dialog'

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
  const [deleteTarget, setDeleteTarget] = useState<TemplateTarget | null>(null)
  const deleteTemplate = useUndoableMutation(
    (target: TemplateTarget) => remove({ templateId: target.templateId }),
    async (args) => { await undo(args) },
    (target) => `Deleted ${target.name}`,
  )
  function report(verb: string, error: unknown): void {
    show({ message: `Could not ${verb} template. ${error instanceof Error ? error.message : String(error)}` })
  }
  return <>
    <AppHeader title="Coaching templates" meta={templates ? `${templates.length} templates` : undefined}>
      <Button className="ml-auto" size="sm" onClick={() => setDialog('create')}>New template</Button>
    </AppHeader>
    <Page width="max-w-[820px]">
    <p className="max-w-[64ch] text-[13.5px] text-muted-foreground">
      These are the fields you chart against and the words your staff uses. Change them once and every opponent workspace, past and future, speaks the same language.
    </p>
    {templates === undefined ? <div aria-label="Loading Coaching Templates" role="status" className="space-y-3">
      {[0, 1, 2].map((row) => <div key={row} className="h-16 animate-pulse rounded-md bg-muted" />)}
    </div> : templates.length === 0 ? <p className="text-muted-foreground">No Coaching Templates yet</p> :
      <ul className="grid gap-2">
        {templates.map((template) => <li key={template._id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-brand/50">
          <div className="min-w-0">
            <Link className="text-base font-semibold tracking-tight hover:text-brand" to={`/templates/${template._id}`}>{template.name}</Link>
            {template.isStarter && <span className="ml-2 rounded-md bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-brand">starter</span>}
            <Meta className="mt-0.5 block">{template.coachingArea}</Meta>
          </div>
          <DropdownMenu label="Actions" triggerProps={{ 'aria-label': `Actions for ${template.name}`, variant: 'outline' }} items={[
            { label: 'Rename', onSelect: () => setDialog({ templateId: template._id, name: template.name }) },
            { label: 'Duplicate', onSelect: () => { void duplicate({ templateId: template._id })
              .then(() => show({ message: `Duplicated ${template.name}` })).catch((error: unknown) => report('duplicate', error)) } },
            { label: 'Delete', onSelect: () => setDeleteTarget({ templateId: template._id, name: template.name }) },
          ]} />
        </li>)}
      </ul>}
    {deleteTarget && <DeleteConfirmDialog open kind="template" name={deleteTarget.name}
      args={{ templateId: deleteTarget.templateId }} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      onConfirm={() => deleteTemplate(deleteTarget).catch((error: unknown) => { report('delete', error); throw error })} />}
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
    </Page>
  </>
}
