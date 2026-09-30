import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { HASHES } from '@convex/domain/coreFields'
import { NAME_MAX_LENGTH } from '@convex/domain/names'
import { cardNumbers, patchRep, PRACTICE_PERIOD_MAX_REPS, PRACTICE_REP_NOTE_MAX_LENGTH, PRACTICE_SCRIPT_MAX_PERIODS } from '@convex/domain/practiceScript'
import { NameDialog } from '@/components/name-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Meta, Page, Panel } from '@/components/ui/panel'
import { Select } from '@/components/ui/select'
import { useAutosave } from '@/lib/db/use-autosave'
import { useReorder } from '@/lib/reorder'
import { AddPeriodDialog, type Card } from './add-period-dialog'

type Script = NonNullable<FunctionReturnType<typeof api.practiceScripts.get>>
type Period = Script['periods'][number]
type Rep = Period['reps'][number]

export function ScriptEditor({ workspaceId, scriptId }: { readonly workspaceId: string; readonly scriptId: string }): ReactNode {
  const script = useQuery(api.practiceScripts.get, { workspaceId, scriptId })
  const cards = useQuery(api.practiceScripts.cards, { workspaceId })
  if (script === undefined || cards === undefined) return <div role="status" aria-label="Loading Practice Script" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!script) return <main className="space-y-3 p-6"><h1>Practice Script not found</h1><Link className="underline" to={`/w/${workspaceId}/practice`}>Practice Scripts</Link></main>
  return <Editor key={script._id} workspaceId={workspaceId} script={script} cards={cards} />
}

function Editor({ workspaceId, script, cards }: { readonly workspaceId: string; readonly script: Script; readonly cards: readonly Card[] }): ReactNode {
  const savePeriods = useMutation(api.practiceScripts.savePeriods)
  const rename = useMutation(api.practiceScripts.rename)
  const { draft, setDraft, status } = useAutosave(script.periods, async (periods) => { await savePeriods({ scriptId: script._id, periods }) })
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const live = new Map(cards.map((card) => [card.diagramId, card]))
  const numbers = cardNumbers(draft, (id) => live.has(id))
  const base = `/w/${workspaceId}/practice/${script._id}`
  const outline = buttonVariants({ variant: 'outline', size: 'sm' })
  return <Page width="max-w-[1100px]">
    <header className="flex flex-wrap items-center gap-3">
      <h1 className="text-xl font-bold">{script.name}</h1>
      <Button variant="ghost" size="sm" onClick={() => setRenaming(true)}>Rename</Button>
      <Meta role="status">{status === 'error' ? 'Not saved. Check down (1–4) and distance (0–99).' : status === 'idle' ? 'Saved' : 'Saving…'}</Meta>
      <Link className={`${outline} ml-auto`} to={`${base}/print`}>Print script</Link>
      <Link className={outline} to={`${base}/cards`}>Print Scout Cards</Link>
    </header>
    {cards.length === 0 && <p>No Play Diagrams in this Workspace yet. Draw them from a Source Game's Play Diagrams tab. Each one becomes a Scout Card.</p>}
    {draft.map((period, index) => <PeriodEditor key={period.id} period={period} cards={cards} numbers={numbers}
      onChange={(next) => setDraft(draft.map((item, itemIndex) => itemIndex === index ? next : item))}
      onRemove={() => setDraft(draft.filter((_, itemIndex) => itemIndex !== index))} />)}
    <div><Button disabled={cards.length === 0 || draft.length >= PRACTICE_SCRIPT_MAX_PERIODS} onClick={() => setAdding(true)}>Add period</Button></div>
    {adding && <AddPeriodDialog open onOpenChange={setAdding} cards={cards} periodNumber={draft.length + 1} onAdd={(period) => setDraft([...draft, period])} />}
    <NameDialog open={renaming} title="Rename Practice Script" label="Name" initialValue={script.name} confirmLabel="Rename"
      onOpenChange={setRenaming} onConfirm={async (name) => { await rename({ scriptId: script._id, name }) }} />
  </Page>
}

function PeriodEditor({ period, cards, numbers, onChange, onRemove }: {
  readonly period: Period; readonly cards: readonly Card[]; readonly numbers: ReadonlyMap<Id<'diagrams'>, number>
  readonly onChange: (next: Period) => void; readonly onRemove: () => void
}): ReactNode {
  const setReps = (reps: Rep[]): void => onChange({ ...period, reps })
  const setRep = (index: number, next: Rep): void => setReps(period.reps.map((rep, repIndex) => repIndex === index ? next : rep))
  const reorder = useReorder({
    itemCount: period.reps.length, label: (index) => `Rep ${index + 1}`,
    onReorder: (from, to) => { const reps = [...period.reps]; const [moved] = reps.splice(from, 1); if (moved) reps.splice(to, 0, moved); setReps(reps) },
  })
  const firstCard = cards[0]
  return <Panel className="grid gap-3 p-4">
    <div className="flex items-center gap-2">
      <Input aria-label="Period name" maxLength={NAME_MAX_LENGTH} className="max-w-sm font-semibold" value={period.name} onChange={(event) => onChange({ ...period, name: event.target.value })} />
      <Meta>{period.reps.length} reps</Meta>
      <Button className="ml-auto" size="sm" variant="outline" onClick={onRemove}>Remove period</Button>
    </div>
    <p aria-live="polite" className="sr-only">{reorder.announcement}</p>
    <table className="w-full text-sm">
      <thead><tr><th className="text-left">Rep</th><th className="text-left">Card</th><th>Down</th><th>Dist</th><th>Hash</th><th className="text-left">Note</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{period.reps.map((rep, index) => <tr key={rep.id} {...reorder.getItemProps(index)} className={reorder.dragOverIndex === index ? 'bg-muted' : ''}>
        <td>{index + 1}</td>
        <td><Select aria-label={`Rep ${index + 1} card`} value={rep.diagramId} onChange={(event) => {
          const card = cards.find((item) => item.diagramId === event.target.value)
          if (card) setRep(index, patchRep(rep, { diagramId: card.diagramId }))
        }}>
          {!numbers.has(rep.diagramId) && !cards.some((card) => card.diagramId === rep.diagramId) && <option value={rep.diagramId} disabled>Deleted Play Diagram</option>}
          {cards.map((card) => <option key={card.diagramId} value={card.diagramId}>{numbers.has(card.diagramId) ? `#${numbers.get(card.diagramId)} ` : ''}{card.title}</option>)}
        </Select></td>
        <td><Select aria-label={`Rep ${index + 1} down`} value={rep.down ?? ''} onChange={(event) => setRep(index, patchRep(rep, { down: event.target.value ? Number(event.target.value) : undefined }))}>
          <option value="">–</option>{[1, 2, 3, 4].map((down) => <option key={down} value={down}>{down}</option>)}
        </Select></td>
        <td><Input aria-label={`Rep ${index + 1} distance`} type="number" min={0} max={99} className="w-20" value={rep.distance ?? ''}
          onChange={(event) => setRep(index, patchRep(rep, { distance: event.target.value === '' ? undefined : Number(event.target.value) }))} /></td>
        <td><Select aria-label={`Rep ${index + 1} hash`} value={rep.hash ?? ''} onChange={(event) => setRep(index, patchRep(rep, { hash: HASHES.find((hash) => hash === event.target.value) }))}>
          <option value="">–</option>{HASHES.map((hash) => <option key={hash} value={hash}>{hash}</option>)}
        </Select></td>
        <td><Input aria-label={`Rep ${index + 1} note`} maxLength={PRACTICE_REP_NOTE_MAX_LENGTH} value={rep.note ?? ''}
          onChange={(event) => setRep(index, patchRep(rep, { note: event.target.value || undefined }))} /></td>
        <td className="whitespace-nowrap">
          <Button size="sm" variant="ghost" aria-label={`Move rep ${index + 1} up`} disabled={!reorder.canMoveUp(index)} onClick={() => reorder.moveUp(index)}>↑</Button>
          <Button size="sm" variant="ghost" aria-label={`Move rep ${index + 1} down`} disabled={!reorder.canMoveDown(index)} onClick={() => reorder.moveDown(index)}>↓</Button>
          <Button size="sm" variant="ghost" aria-label={`Remove rep ${index + 1}`} onClick={() => setReps(period.reps.filter((_, repIndex) => repIndex !== index))}>×</Button>
        </td>
      </tr>)}</tbody>
    </table>
    <div><Button size="sm" variant="outline" disabled={!firstCard || period.reps.length >= PRACTICE_PERIOD_MAX_REPS}
      onClick={() => { if (firstCard) setReps([...period.reps, { id: crypto.randomUUID(), diagramId: firstCard.diagramId }]) }}>Add rep</Button></div>
  </Panel>
}
