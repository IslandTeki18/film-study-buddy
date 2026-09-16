import { useId, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc } from '@convex/_generated/dataModel'
import { NAME_MAX_LENGTH } from '@convex/domain/names'
import { TENDENCY_NOTE_MAX_LENGTH } from '@convex/domain/tendencyCategories'
import { DiagramSvg } from '@/components/diagram-svg'
import { TendencyCategorySelect } from '@/components/tendency-category-select'
import { TendencySnapshot } from '@/components/tendency-snapshot'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Meta, Panel } from '@/components/ui/panel'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useAutosave } from '@/lib/db/use-autosave'

export function TendencyCard({ tendency, diagrams, onDelete }: {
  readonly tendency: Doc<'tendencies'>
  readonly diagrams: readonly (Doc<'diagrams'> & { sourceGameLabel: string })[]
  readonly onDelete: () => void
}): ReactNode {
  const id = useId()
  const { show } = useToast()
  const update = useMutation(api.tendencies.update)
  const title = useAutosave(tendency.title, async (title) => { await update({ tendencyId: tendency._id, title }) })
  const note = useAutosave(tendency.note, async (note) => { await update({ tendencyId: tendency._id, note }) })
  const diagram = diagrams.find((diagram) => diagram._id === tendency.diagramId)
  const commit = (fields: Omit<Parameters<typeof update>[0], 'tendencyId'>): void => {
    void update({ tendencyId: tendency._id, ...fields }).catch((error: unknown) => show({ message: `Could not update Tendency / Alert. ${error instanceof Error ? error.message : String(error)}` }))
  }
  return <Panel className="grid gap-4 p-4">
    <div className="space-y-1"><label htmlFor={`${id}-title`}>Title</label><Input id={`${id}-title`} maxLength={NAME_MAX_LENGTH} value={title.draft} onChange={(event) => title.setDraft(event.target.value)} onBlur={title.flush} />
      {title.status !== 'idle' && <Meta role="status">{title.status === 'error' ? <>Save failed <Button variant="ghost" size="sm" onClick={title.flush}>Retry</Button></> : 'Saving…'}</Meta>}
    </div>
    <fieldset disabled={title.status !== 'idle' || note.status !== 'idle'} className="space-y-1"><label htmlFor={`${id}-category`}>Category</label><TendencyCategorySelect id={`${id}-category`} value={tendency.category} onChange={(category) => commit({ category })} />
      {(title.status === 'error' || note.status === 'error') && <Meta>Resolve the failed save before changing category.</Meta>}
    </fieldset>
    <TendencySnapshot snapshot={tendency.snapshot} />
    <Meta>From {tendency.snapshot.gameIds.length} Source Games · created {new Date(tendency.createdAt).toLocaleDateString()}</Meta>
    <div className="space-y-1"><label htmlFor={`${id}-note`}>Coach explanation</label><Textarea id={`${id}-note`} maxLength={TENDENCY_NOTE_MAX_LENGTH} value={note.draft} onChange={(event) => note.setDraft(event.target.value)} onBlur={note.flush} />
      {note.status !== 'idle' && <Meta role="status">{note.status === 'error' ? <>Save failed <Button variant="ghost" size="sm" onClick={note.flush}>Retry</Button></> : 'Saving…'}</Meta>}
    </div>
    <div className="space-y-1"><label htmlFor={`${id}-diagram`}>Play Diagram</label><Select id={`${id}-diagram`} value={diagram?._id ?? ''} onChange={(event) => commit({ diagramId: diagrams.find((diagram) => diagram._id === event.target.value)?._id ?? null })}>
      <option value="">No Play Diagram</option>{diagrams.map((diagram) => <option key={diagram._id} value={diagram._id}>{diagram.name ?? 'Play Diagram'} · {diagram.sourceGameLabel}</option>)}
    </Select></div>
    {diagram ? <DiagramSvg diagram={diagram} {...(diagram.hiddenSide ? { hideSide: diagram.hiddenSide } : {})} className="max-w-md" /> : tendency.diagramId && <Meta>Play Diagram removed</Meta>}
    <div className="flex flex-wrap items-center justify-between gap-3"><Checkbox label="Include in reports" checked={tendency.includeInReport} onChange={(event) => commit({ includeInReport: event.target.checked })} /><Button variant="ghost" onClick={onDelete}>Delete</Button></div>
  </Panel>
}
