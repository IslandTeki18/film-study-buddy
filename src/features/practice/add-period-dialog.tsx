import { useId, useState, type ReactNode } from 'react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '@convex/_generated/api'
import { NAME_MAX_LENGTH } from '@convex/domain/names'
import { buildReps, PRACTICE_PERIOD_MAX_REPS, type ScriptPeriod } from '@convex/domain/practiceScript'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Meta } from '@/components/ui/panel'

export type Card = FunctionReturnType<typeof api.practiceScripts.cards>[number]

export function AddPeriodDialog({ open, onOpenChange, cards, periodNumber, onAdd }: {
  readonly open: boolean; readonly onOpenChange: (open: boolean) => void; readonly cards: readonly Card[]
  readonly periodNumber: number; readonly onAdd: (period: ScriptPeriod<Card['diagramId']>) => void
}): ReactNode {
  const id = useId()
  const [name, setName] = useState(`Period ${periodNumber}`)
  const [reps, setReps] = useState('12')
  const [selected, setSelected] = useState(() => {
    const weighted = cards.filter((card) => card.weight > 0)
    return new Set((weighted.length ? weighted : cards).map((card) => card.diagramId))
  })
  const total = Number(reps)
  const valid = Number.isInteger(total) && total >= 1 && total <= PRACTICE_PERIOD_MAX_REPS && selected.size > 0
  return <Dialog open={open} onOpenChange={onOpenChange} aria-labelledby={`${id}-heading`}>
    <form className="grid gap-4" onSubmit={(event) => {
      event.preventDefault()
      if (!valid) return
      const chosen = cards.filter((card) => selected.has(card.diagramId))
      onAdd({ id: crypto.randomUUID(), name: name.trim() || `Period ${periodNumber}`, reps: buildReps(chosen, total, () => crypto.randomUUID()) })
      onOpenChange(false)
    }}>
      <h2 id={`${id}-heading`} className="text-lg font-semibold">Add period</h2>
      <div><label htmlFor={`${id}-name`}>Period name</label><Input id={`${id}-name`} autoFocus maxLength={NAME_MAX_LENGTH} value={name} onChange={(event) => setName(event.target.value)} /></div>
      <div><label htmlFor={`${id}-reps`}>Reps</label><Input id={`${id}-reps`} type="number" min={1} max={PRACTICE_PERIOD_MAX_REPS} value={reps} onChange={(event) => setReps(event.target.value)} /></div>
      <fieldset className="grid max-h-72 gap-1 overflow-y-auto">
        <legend className="mb-1">Scout Cards (reps are weighted by charted snaps)</legend>
        {cards.map((card) => <label key={card.diagramId} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selected.has(card.diagramId)} onChange={(event) => {
            const next = new Set(selected)
            if (event.target.checked) next.add(card.diagramId); else next.delete(card.diagramId)
            setSelected(next)
          }} />
          {card.title} <Meta>{card.weight} snaps</Meta>
        </label>)}
      </fieldset>
      {!valid && <p role="alert" className="text-sm">Choose at least one card and 1–{PRACTICE_PERIOD_MAX_REPS} reps.</p>}
      <div className="flex gap-2"><Button type="submit" disabled={!valid}>Add</Button><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button></div>
    </form>
  </Dialog>
}
