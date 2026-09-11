import { useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { TEMPLATE_FIELD_TYPE_LABELS } from '@convex/domain/templateFields'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'
import { useReorder } from '@/lib/reorder'
import { cn } from '@/lib/utils'
import { InlineName } from './inline-name'

export type TemplateTree = NonNullable<FunctionReturnType<typeof api.templates.getFull>>
type Section = TemplateTree['sections'][number]

export function moved<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  if (item !== undefined) next.splice(to, 0, item)
  return next
}

export function SectionList({ tree, selectedFieldId, onSelectField }: {
  readonly tree: TemplateTree
  readonly selectedFieldId: Id<'templateFields'> | null
  readonly onSelectField: (id: Id<'templateFields'>) => void
}): ReactNode {
  const templateId = tree.template._id
  const [focusId, setFocusId] = useState<string | null>(null)
  const add = useMutation(api.templates.addSection)
  const rename = useMutation(api.templates.renameSection)
  const remove = useMutation(api.templates.removeSection)
  const undo = useMutation(api.deletions.undo)
  const { show } = useToast()
  const reorder = useMutation(api.templates.reorderSections).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.templates.getFull, { templateId: args.templateId })
    if (!current) return
    const sections = args.sectionIds.flatMap((id, order) => {
      const section = current.sections.find((section) => section._id === id)
      return section ? [{ ...section, order }] : []
    })
    store.setQuery(api.templates.getFull, { templateId: args.templateId }, { ...current, sections })
  })
  const deleteSection = useUndoableMutation(
    (section: Section) => remove({ sectionId: section._id }),
    async (args) => { await undo(args) }, (section) => `Deleted section ${section.name}`,
  )
  function report(error: unknown): void {
    show({ message: `Could not update section. ${error instanceof Error ? error.message : String(error)}` })
  }
  const drag = useReorder({
    itemCount: tree.sections.length,
    label: (index) => tree.sections[index]?.name ?? 'Section',
    onReorder: (from, to) => { void reorder({
      templateId, sectionIds: moved(tree.sections, from, to).map((section) => section._id),
    }).catch(report) },
  })
  return <div className="space-y-4">
    {tree.sections.length === 0 && <p className="text-muted-foreground">This template has no sections yet</p>}
    {tree.sections.map((section, index) => <section key={section._id} aria-label={section.name}
      className={cn('space-y-3 rounded-md border border-border p-3', drag.dragOverIndex === index && 'border-primary')}>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" aria-label={`Drag section ${section.name}`} {...drag.getItemProps(index)}>⠿</Button>
        <InlineName label={`Section name: ${section.name}`} value={section.name} focus={focusId === section._id}
          save={async (name) => { await rename({ sectionId: section._id, name }) }} />
        <Button variant="ghost" size="sm" aria-label={`Move section ${section.name} up`}
          disabled={!drag.canMoveUp(index)} onClick={() => drag.moveUp(index)}>Move up</Button>
        <Button variant="ghost" size="sm" aria-label={`Move section ${section.name} down`}
          disabled={!drag.canMoveDown(index)} onClick={() => drag.moveDown(index)}>Move down</Button>
        <Button variant="ghost" size="sm" onClick={() => { void deleteSection(section).catch(report) }}>Remove section</Button>
      </div>
      <FieldList section={section} selectedFieldId={selectedFieldId} onSelectField={onSelectField} />
    </section>)}
    <p className="sr-only" aria-live="polite">{drag.announcement}</p>
    <Button variant="outline" onClick={() => { void add({ templateId, name: 'New section' })
      .then(setFocusId).catch(report) }}>Add section</Button>
  </div>
}

function FieldList({ section, selectedFieldId, onSelectField }: {
  readonly section: Section
  readonly selectedFieldId: Id<'templateFields'> | null
  readonly onSelectField: (id: Id<'templateFields'>) => void
}): ReactNode {
  const [focusId, setFocusId] = useState<Id<'templateFields'> | null>(null)
  const add = useMutation(api.templates.addField)
  const update = useMutation(api.templates.updateField)
  const remove = useMutation(api.templates.removeField)
  const undo = useMutation(api.deletions.undo)
  const { show } = useToast()
  const reorder = useMutation(api.templates.reorderFields).withOptimisticUpdate((store, args) => {
    const templateId = section.templateId
    const current = store.getQuery(api.templates.getFull, { templateId })
    if (!current) return
    store.setQuery(api.templates.getFull, { templateId }, {
      ...current, sections: current.sections.map((item) => item._id !== args.sectionId ? item : {
        ...item, fields: args.fieldIds.flatMap((id, order) => {
          const field = item.fields.find((field) => field._id === id)
          return field ? [{ ...field, order }] : []
        }),
      }),
    })
  })
  const deleteField = useUndoableMutation(
    (field: Section['fields'][number]) => remove({ fieldId: field._id }),
    async (args) => { await undo(args) }, (field) => `Deleted field ${field.name}`,
  )
  function report(error: unknown): void {
    show({ message: `Could not update field. ${error instanceof Error ? error.message : String(error)}` })
  }
  const drag = useReorder({
    itemCount: section.fields.length,
    label: (index) => section.fields[index]?.name ?? 'Template Field',
    onReorder: (from, to) => { void reorder({
      sectionId: section._id, fieldIds: moved(section.fields, from, to).map((field) => field._id),
    }).catch(report) },
  })
  return <div className="space-y-2">
    {section.fields.map((field, index) => <div key={field._id} onClick={(event) => {
      if (!(event.target instanceof Element) || !event.target.closest('button, input')) onSelectField(field._id)
    }}
      className={cn('flex flex-wrap items-center gap-2 rounded border border-border p-2', drag.dragOverIndex === index && 'border-primary', selectedFieldId === field._id && 'bg-accent')}>
      <Button variant="ghost" size="sm" aria-label={`Drag field ${field.name}`} {...drag.getItemProps(index)}>⠿</Button>
      <InlineName label={`Field name: ${field.name}`} value={field.name} focus={focusId === field._id}
        save={async (name) => { await update({ fieldId: field._id, name }) }} />
      <span className="text-xs text-muted-foreground">{TEMPLATE_FIELD_TYPE_LABELS[field.type]}</span>
      <Button size="sm" variant="ghost" aria-label={`Edit field ${field.name}`}
        aria-pressed={selectedFieldId === field._id} onClick={() => onSelectField(field._id)}>Edit</Button>
      {field.required && <span className="rounded bg-muted px-1 text-xs">Required</span>}
      {field.carryForward && <span className="rounded bg-muted px-1 text-xs">Carry-Forward</span>}
      <Button variant="ghost" size="sm" aria-label={`Move field ${field.name} up`}
        disabled={!drag.canMoveUp(index)} onClick={() => drag.moveUp(index)}>Move up</Button>
      <Button variant="ghost" size="sm" aria-label={`Move field ${field.name} down`}
        disabled={!drag.canMoveDown(index)} onClick={() => drag.moveDown(index)}>Move down</Button>
      <Button variant="ghost" size="sm" onClick={() => { void deleteField(field).catch(report) }}>Remove field</Button>
    </div>)}
    <p className="sr-only" aria-live="polite">{drag.announcement}</p>
    <Button variant="outline" size="sm" onClick={() => { void add({ sectionId: section._id, name: 'New field', type: 'shortText' })
      .then(setFocusId).catch(report) }}>Add field</Button>
  </div>
}
