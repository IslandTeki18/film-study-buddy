import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import type { FunctionArgs } from 'convex/server'
import { api } from '@convex/_generated/api'
import type { Doc } from '@convex/_generated/dataModel'
import {
  TEMPLATE_FIELD_TYPES, TEMPLATE_FIELD_TYPE_LABELS, hasOptions, isTemplateFieldType,
  RATING_MIN, RATING_MAX,
} from '@convex/domain/templateFields'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { InlineName } from './inline-name'

export function FieldEditor({ field }: { readonly field: Doc<'templateFields'> }): ReactNode {
  const usage = useQuery(api.templates.getUsage, { templateId: field.templateId, fieldId: field._id })
  const update = useMutation(api.templates.updateField)
  const addOption = useMutation(api.templates.addFieldOption)
  const { show } = useToast()
  const [option, setOption] = useState('')
  const [pending, setPending] = useState(false)
  function report(error: unknown): void {
    show({ message: `Could not update field. ${error instanceof Error ? error.message : String(error)}` })
  }
  function change(patch: Omit<FunctionArgs<typeof api.templates.updateField>, 'fieldId'>): void {
    setPending(true)
    void update({ fieldId: field._id, ...patch }).catch(report).finally(() => setPending(false))
  }
  return <aside aria-label="Template Field editor" className="space-y-4 rounded-md border border-border p-4">
    <h2 className="text-lg font-semibold">Template Field</h2>
    <InlineName value={field.name} label="Field name" save={async (name) => {
      try { await update({ fieldId: field._id, name }) } catch (error) { report(error); throw error }
    }} />
    <fieldset disabled={pending} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm">Type</span>
        <Select value={field.type} disabled={usage === undefined || usage.snapCount > 0}
          aria-describedby={usage && usage.snapCount > 0 ? 'field-type-usage' : undefined} onChange={(event) => {
          if (isTemplateFieldType(event.target.value)) change({ type: event.target.value })
        }}>
          {TEMPLATE_FIELD_TYPES.map((type) => <option key={type} value={type}>{TEMPLATE_FIELD_TYPE_LABELS[type]}</option>)}
        </Select>
      </label>
      {usage && usage.snapCount > 0 && <p id="field-type-usage" className="text-sm text-muted-foreground">
        This field holds data on {usage.snapCount} Snaps; its type cannot change
      </p>}
      {hasOptions(field.type) && <div className="space-y-2">
        <h3 className="text-sm font-medium">Options</h3>
        <ul className="space-y-1">
          {field.options.map((value) => <li key={value} className="flex items-center justify-between gap-2 text-sm">
            <span>{value}</span>
            <Button size="sm" variant="ghost" aria-label={`Remove option ${value}`}
              onClick={() => change({ options: field.options.filter((item) => item !== value) })}>Remove</Button>
          </li>)}
        </ul>
        <form className="flex gap-2" onSubmit={(event) => {
          event.preventDefault()
          if (pending || !option.trim()) return
          setPending(true)
          void addOption({ fieldId: field._id, option }).then(() => setOption(''))
            .catch(report).finally(() => setPending(false))
        }}>
          <Input aria-label="New option" value={option} onChange={(event) => setOption(event.target.value)} />
          <Button type="submit" size="sm" disabled={!option.trim()}>Add option</Button>
        </form>
      </div>}
      {field.type === 'rating' && <p className="text-sm text-muted-foreground">Fixed {RATING_MIN}–{RATING_MAX} scale</p>}
      <Checkbox label="Required: counts toward completeness warnings" checked={field.required}
        onChange={(event) => change({ required: event.target.checked })} />
      <Checkbox label="Carry-Forward: copy from the previous Snap when creating the next one" checked={field.carryForward}
        onChange={(event) => change({ carryForward: event.target.checked })} />
    </fieldset>
  </aside>
}
