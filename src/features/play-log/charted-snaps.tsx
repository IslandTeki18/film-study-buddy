import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'
import { Link } from 'react-router'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { fieldZoneOf, isValidYardLine } from '@convex/domain/fieldZone'
import { Button } from '@/components/ui/button'
import { Eyebrow, Meta } from '@/components/ui/panel'
import { cn } from '@/lib/utils'
import { RowActions } from './row-actions'

export const LOG_GRID = 'grid grid-cols-[52px_30px_100px_minmax(76px,1fr)_52px_minmax(100px,1fr)_minmax(108px,1.25fr)_88px_32px] items-center gap-2 px-3'
export const LOG_HEADERS = ['#', '★', 'D&D', 'Zone', 'Pers', 'Form', 'Call', 'Result']
const SELECT_LOG_GRID = 'grid grid-cols-[28px_52px_30px_100px_minmax(76px,1fr)_52px_minmax(100px,1fr)_minmax(108px,1.25fr)_88px_32px] items-center gap-2 px-3'
const cell = 'truncate font-mono text-[11.5px] text-foreground/80'

export function ChartedSnaps({ snaps, freshId, base, sourceGameId, onDuplicated }: {
  readonly snaps: readonly Doc<'snaps'>[]
  readonly freshId: Id<'snaps'> | null
  readonly base: string
  readonly workspaceId: string
  readonly sourceGameId: Id<'sourceGames'>
  readonly onDuplicated: (id: Id<'snaps'>) => void
}): ReactNode {
  const [onlyReview, setOnlyReview] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<Id<'snaps'>>>(new Set())
  const anchor = useRef<Id<'snaps'> | null>(null)
  const allCheckbox = useRef<HTMLInputElement>(null)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const { show } = useToast()
  const liveSelected = new Set(snaps.filter((snap) => selected.has(snap._id)).map((snap) => snap._id))
  const remove = useMutation(api.snaps.removeMany).withOptimisticUpdate((store, args) => {
    const query = { sourceGameId: args.sourceGameId }
    const current = store.getQuery(api.snaps.listBySourceGame, query)
    const ids = new Set(args.snapIds)
    if (current) store.setQuery(api.snaps.listBySourceGame, query, current.filter((snap) => !ids.has(snap._id)))
  })
  const undo = useMutation(api.deletions.undo)
  const deleteSnaps = useUndoableMutation((snapIds: Id<'snaps'>[]) => remove({ sourceGameId, snapIds }),
    async (args) => { await undo(args) }, (snapIds) => `Deleted ${snapIds.length} ${snapIds.length === 1 ? 'Snap' : 'Snaps'}`)
  const reviewCount = snaps.filter((snap) => snap.mustReview).length
  const shown = [...snaps].reverse().filter((snap) => !onlyReview || snap.mustReview)
  const shownSelected = shown.filter((snap) => liveSelected.has(snap._id)).length
  useEffect(() => {
    if (allCheckbox.current) allCheckbox.current.indeterminate = shownSelected > 0 && shownSelected < shown.length
  }, [shownSelected, shown.length])
  const count = pending ? selected.size : liveSelected.size
  const selectionLabel = `${count} ${count === 1 ? 'Snap' : 'Snaps'}`
  return <div className="mt-6">
    <div className="mb-2.5 flex flex-wrap items-center gap-3">
      <h2><Eyebrow className="text-xs">Charted snaps</Eyebrow></h2>
      <Meta>{snaps.length} charted · {reviewCount} must review</Meta>
      <Button variant="outline" size="sm" aria-pressed={onlyReview} onClick={() => setOnlyReview((current) => !current)}
        className={cn('ml-auto h-7 bg-transparent text-[10.5px]', onlyReview && 'border-warm text-warm')}>
        {onlyReview ? 'Showing must review only' : 'Show must review only'}
      </Button>
    </div>
    {liveSelected.size > 0 && <div className="mb-2.5 flex flex-wrap items-center gap-3">
      <Meta role="status">{liveSelected.size} selected</Meta>
      <Button variant="ghost" size="sm" onClick={() => { setSelected(new Set()); anchor.current = null }}>Clear selection</Button>
      <Button size="sm" onClick={() => { setError(''); setConfirming(true) }}>Delete {selectionLabel}</Button>
    </div>}
    <div className="overflow-x-auto rounded-[10px] border border-border">
      {snaps.length === 0 ? <div className="px-4 py-6">
        <h2 className="font-semibold">No Snaps yet</h2>
        <Link className="underline" to={`${base}/import`}>Import Hudl CSV</Link>
      </div> : <div role="table" aria-label="Charted snaps" className="min-w-[770px]">
        <div role="rowgroup">
          <div role="row" className={cn(SELECT_LOG_GRID, 'bg-muted py-2 font-mono text-[9.5px] tracking-[0.06em] text-muted-foreground uppercase')}>
            <div role="columnheader"><input ref={allCheckbox} type="checkbox" aria-label="Select all shown Snaps"
              checked={shown.length > 0 && shownSelected === shown.length} onChange={(event) => {
                const next = new Set(liveSelected)
                for (const snap of shown) { if (event.target.checked) next.add(snap._id); else next.delete(snap._id) }
                setSelected(next)
              }} /></div>
            {LOG_HEADERS.map((label, index) =>
              <div role="columnheader" key={label} className={cn(index === 1 && 'text-center', index === 7 && 'text-right')}>{label}</div>)}
            <div role="columnheader"><span className="sr-only">Snap actions</span></div>
          </div>
        </div>
        <div role="rowgroup" className="max-h-[340px] overflow-y-auto">
          {shown.map((snap) => {
            const { core } = snap
            const label = core.clipNumber ?? snap.order
            return <div role="row" key={snap._id} className={cn(SELECT_LOG_GRID, 'border-t border-border py-2', snap._id === freshId && 'bg-primary/10')}>
              <div role="cell"><input type="checkbox" aria-label={`Select Snap ${label}`} checked={liveSelected.has(snap._id)}
                onChange={() => {}} onClick={(event) => {
                  const next = new Set(liveSelected)
                  const checked = event.currentTarget.checked
                  const start = shown.findIndex((item) => item._id === anchor.current)
                  const end = shown.indexOf(snap)
                  const range = event.shiftKey && start >= 0 ? shown.slice(Math.min(start, end), Math.max(start, end) + 1) : [snap]
                  for (const item of range) { if (checked) next.add(item._id); else next.delete(item._id) }
                  setSelected(next); anchor.current = snap._id
                }} /></div>
              <Link to={`${base}/snap/${snap._id}`} aria-label={`Open Play Detail for Snap ${label}`}
                className="contents focus-visible:[&>div]:outline-2 focus-visible:[&>div]:outline-ring">
                <SnapRowCells snap={snap} />
              </Link>
              <div role="cell"><RowActions snap={snap} base={base} onDuplicated={onDuplicated} /></div>
            </div>
          })}
        </div>
      </div>}
    </div>
    <Dialog open={confirming} onOpenChange={(open) => { if (!pending) setConfirming(open) }} aria-label={`Delete ${selectionLabel}?`}
      onCancel={(event) => { if (pending) event.preventDefault() }}>
      {confirming && <div className="space-y-4">
        <h2 className="text-lg font-semibold">Delete {selectionLabel}?</h2>
        <p>Their Cell Notes, Quick Notes and Play Diagrams are soft-deleted with them. Undo restores them together.</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button autoFocus variant="outline" disabled={pending} onClick={() => setConfirming(false)}>Cancel</Button>
          <Button disabled={pending || !liveSelected.size} onClick={() => {
            if (pending || !liveSelected.size) return
            const ids = [...liveSelected]
            setSelected(new Set(ids)); setPending(true); setError('')
            void deleteSnaps(ids).then(() => {
              setConfirming(false); setSelected(new Set()); anchor.current = null
            }).catch((error: unknown) => {
              const message = `Could not delete Snaps. ${error instanceof Error ? error.message : String(error)}`
              setError(message); show({ message })
            }).finally(() => setPending(false))
          }}>Delete {selectionLabel}</Button>
        </div>
      </div>}
    </Dialog>
  </div>
}

export function SnapRowCells({ snap }: { readonly snap: Doc<'snaps'> }): ReactNode {
  const { core } = snap
  const label = core.clipNumber ?? snap.order
  return <>
                <div role="cell" className={cn(cell, 'text-muted-foreground')}>{label}</div>
                <div role="cell" className={cn(cell, 'text-center text-warm')}>{snap.mustReview ? '★' : ''}</div>
                <div role="cell" className={cell}>{[core.down, core.distance].filter((value) => value !== undefined).join(' & ')}</div>
                <div role="cell" className={cn(cell, 'text-muted-foreground')}>{isValidYardLine(core.yardLine) ? fieldZoneOf(core.yardLine) : ''}</div>
                <div role="cell" className={cell}>{core.personnel ?? ''}</div>
                <div role="cell" className={cell}>{core.formation ?? ''}</div>
                <div role="cell" className={cn(cell, 'text-foreground')}>{core.playConcept ?? ''}</div>
                <div role="cell" className={cn(cell, 'text-right text-muted-foreground')}>{core.yards === undefined ? '' : `${core.yards > 0 ? '+' : ''}${core.yards}`}</div>
  </>
}
