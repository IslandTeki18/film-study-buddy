import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'
import { Link, useNavigate } from 'react-router'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { fieldZoneOf, isValidYardLine } from '@convex/domain/fieldZone'
import { Button } from '@/components/ui/button'
import { Eyebrow, Meta } from '@/components/ui/panel'
import { cn } from '@/lib/utils'
import { RowActions } from './row-actions'

export const LOG_GRID = 'grid grid-cols-[52px_30px_100px_minmax(76px,1fr)_52px_minmax(100px,1fr)_minmax(108px,1.25fr)_88px_32px] items-center gap-2 px-3'
export const LOG_HEADERS = ['#', '★', 'D&D', 'Zone', 'Pers', 'Form', 'Call', 'Result']
const cell = 'truncate font-mono text-[11.5px] text-foreground/80'

function downDistance(core: Doc<'snaps'>['core']): string {
  return [core.down, core.distance].filter((value) => value !== undefined).join(' & ')
}

function resultText(core: Doc<'snaps'>['core']): string {
  return core.yards === undefined ? '' : `${core.yards > 0 ? '+' : ''}${core.yards}`
}

// ponytail: createdAt groups one-mutation imports; add importBatchId if imports ever span mutations.
function importGroups(snaps: readonly Doc<'snaps'>[]): Array<{ key: number; snapIds: Id<'snaps'>[]; createdAt: number; firstLabel: string; lastLabel: string }> {
  const groups = new Map<number, Doc<'snaps'>[]>()
  for (const snap of snaps) {
    if (snap.imported === undefined) continue
    const group = groups.get(snap.createdAt) ?? []
    group.push(snap); groups.set(snap.createdAt, group)
  }
  return [...groups].sort(([a], [b]) => a - b).map(([createdAt, group]) => {
    group.sort((a, b) => a.order - b.order)
    const first = group[0]!, last = group.at(-1)!
    return { key: createdAt, createdAt, snapIds: group.map((snap) => snap._id),
      firstLabel: first.core.clipNumber ?? String(first.order), lastLabel: last.core.clipNumber ?? String(last.order) }
  })
}

export function ChartedSnaps({ snaps, freshId, base, sourceGameId, onDuplicated }: {
  readonly snaps: readonly Doc<'snaps'>[]
  readonly freshId: Id<'snaps'> | null
  readonly base: string
  readonly workspaceId: string
  readonly sourceGameId: Id<'sourceGames'>
  readonly onDuplicated: (id: Id<'snaps'>) => void
}): ReactNode {
  const navigate = useNavigate()
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
  const shown = [...snaps].reverse().filter((snap) => !onlyReview || snap.mustReview)
  const imports = importGroups(snaps)
  const shownSelected = shown.filter((snap) => liveSelected.has(snap._id)).length
  useEffect(() => {
    if (allCheckbox.current) allCheckbox.current.indeterminate = shownSelected > 0 && shownSelected < shown.length
  }, [shownSelected, shown.length])
  const count = pending ? selected.size : liveSelected.size
  const selectionLabel = `${count} ${count === 1 ? 'Snap' : 'Snaps'}`
  return <div>
    <div className="mb-2.5 flex flex-wrap items-center gap-2">
      {snaps.length > 0 && <input ref={allCheckbox} type="checkbox" aria-label="Select all shown Snaps"
        checked={shown.length > 0 && shownSelected === shown.length} onChange={(event) => {
          const next = new Set(liveSelected)
          for (const snap of shown) { if (event.target.checked) next.add(snap._id); else next.delete(snap._id) }
          setSelected(next)
        }} />}
      <h2><Eyebrow>Charted snaps</Eyebrow></h2>
      <Meta className="text-[10.5px]">newest first</Meta>
      {imports.length > 0 && <DropdownMenu label="Select import" triggerProps={{ variant: 'outline', size: 'sm' }} items={imports.map((group, index) => ({
        label: `Import ${index + 1} · ${group.snapIds.length} Snaps · ${new Date(group.createdAt).toLocaleString()} · Clips ${group.firstLabel}–${group.lastLabel}`,
        onSelect: () => { setOnlyReview(false); setSelected(new Set(group.snapIds)); anchor.current = null },
      }))} />}
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
    {snaps.length === 0 ? <div className="rounded-[10px] border border-border px-4 py-6">
        <h2 className="font-semibold">No Snaps yet</h2>
        <Link className="underline" to={`${base}/import`}>Import Hudl CSV</Link>
      </div> : <ul aria-label="Charted snaps" className="grid max-h-[560px] gap-1.5 overflow-y-auto pr-0.5">
          {shown.map((snap) => {
            const { core } = snap
            const label = core.clipNumber ?? snap.order
            const zone = isValidYardLine(core.yardLine) ? fieldZoneOf(core.yardLine) : ''
            return <li key={snap._id} className={cn('cursor-pointer rounded-[9px] border px-[11px] py-[9px]', snap._id === freshId
              ? 'border-primary/50 bg-primary/[0.07]'
              : 'border-border bg-muted/60 hover:border-muted-foreground/60')}
              onClick={(event) => { if (!(event.target as HTMLElement).closest('input, button, a')) navigate(`${base}/snap/${snap._id}`) }}>
              <div className="flex items-center gap-2">
                <input type="checkbox" aria-label={`Select Snap ${label}`} checked={liveSelected.has(snap._id)}
                onChange={() => {}} onClick={(event) => {
                  const next = new Set(liveSelected)
                  const checked = event.currentTarget.checked
                  const start = shown.findIndex((item) => item._id === anchor.current)
                  const end = shown.indexOf(snap)
                  const range = event.shiftKey && start >= 0 ? shown.slice(Math.min(start, end), Math.max(start, end) + 1) : [snap]
                  for (const item of range) { if (checked) next.add(item._id); else next.delete(item._id) }
                  setSelected(next); anchor.current = snap._id
                }} />
                <Link to={`${base}/snap/${snap._id}`} aria-label={`Open Play Detail, clip ${label}`}
                  className="font-mono text-[10px] text-muted-foreground/80 underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">#{label}</Link>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{core.playConcept ?? '—'}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{resultText(core)}</span>
                {snap.mustReview && <span className="text-warm" aria-label="Must Review">★</span>}
                <RowActions snap={snap} base={base} onDuplicated={onDuplicated} />
              </div>
              <div className="mt-1 truncate pl-6 font-mono text-[10.5px] text-muted-foreground">
                {[downDistance(core), zone, core.personnel, core.formation].filter(Boolean).join(' · ')}
              </div>
            </li>
          })}
      </ul>}
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

export function SnapRowCells({ snap, href, linkLabel }: { readonly snap: Doc<'snaps'>; readonly href: string; readonly linkLabel: string }): ReactNode {
  const { core } = snap
  const label = core.clipNumber ?? snap.order
  return <>
                <td className={cn(cell, 'text-muted-foreground')}><Link className="underline focus-visible:ring-2 focus-visible:ring-ring" to={href} aria-label={linkLabel}>{label}</Link></td>
                <td className={cn(cell, 'text-center text-warm')}>{snap.mustReview ? '★' : ''}</td>
                <td className={cell}>{downDistance(core)}</td>
                <td className={cn(cell, 'text-muted-foreground')}>{isValidYardLine(core.yardLine) ? fieldZoneOf(core.yardLine) : ''}</td>
                <td className={cell}>{core.personnel ?? ''}</td>
                <td className={cell}>{core.formation ?? ''}</td>
                <td className={cn(cell, 'text-foreground')}>{core.playConcept ?? ''}</td>
                <td className={cn(cell, 'text-right text-muted-foreground')}>{resultText(core)}</td>
  </>
}
