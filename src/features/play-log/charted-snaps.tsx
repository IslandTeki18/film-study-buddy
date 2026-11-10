import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'
import { Link } from 'react-router'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { fieldZoneOf, isValidYardLine } from '@convex/domain/fieldZone'
import { Button } from '@/components/ui/button'
import { Chip, Eyebrow, Meta } from '@/components/ui/panel'
import { cn } from '@/lib/utils'
import type { PlayLogColumn } from './columns'
import type { SectionTree } from './palette-model'
import { chartingProgress } from './row-model'
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

export function ChartedSnaps({ snaps, freshId, base, workspaceId, sourceGameId, columns, tree, onDuplicated, onOpenSnap, onChartSnap }: {
  readonly snaps: readonly Doc<'snaps'>[]
  readonly freshId: Id<'snaps'> | null
  readonly base: string
  readonly workspaceId: string
  readonly sourceGameId: Id<'sourceGames'>
  readonly columns: readonly PlayLogColumn[]
  readonly tree: SectionTree
  readonly onDuplicated: (id: Id<'snaps'>) => void
  readonly onOpenSnap: (id: Id<'snaps'>) => void
  readonly onChartSnap: () => void
}): ReactNode {
  const [onlyReview, setOnlyReview] = useState(false)
  const [onlyUncharted, setOnlyUncharted] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<Id<'snaps'>>>(new Set())
  const anchor = useRef<Id<'snaps'> | null>(null)
  const allCheckbox = useRef<HTMLInputElement>(null)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const { show } = useToast()
  const cellNotes = useQuery(api.notes.listCellNotesBySourceGame, { sourceGameId })
  const quickNotes = useQuery(api.notes.listQuickNotes, { sourceGameId })
  const diagrams = useQuery(api.diagrams.listByWorkspace, { workspaceId })
  const cellNoteCounts = new Map<Id<'snaps'>, number>()
  const quickNoteCounts = new Map<Id<'snaps'>, number>()
  const snapsWithDiagrams = new Set<Id<'snaps'>>()
  for (const { snapId } of cellNotes ?? []) {
    cellNoteCounts.set(snapId, (cellNoteCounts.get(snapId) ?? 0) + 1)
  }
  for (const { snapId } of quickNotes ?? []) {
    if (snapId) quickNoteCounts.set(snapId, (quickNoteCounts.get(snapId) ?? 0) + 1)
  }
  for (const diagram of diagrams ?? []) {
    for (const { snapId } of diagram.attachedSnaps) snapsWithDiagrams.add(snapId)
  }
  function indicatorText(snapId: Id<'snaps'>): string {
    const cells = cellNoteCounts.get(snapId)
    const quick = quickNoteCounts.get(snapId)
    const segments = []
    if (cells) segments.push(`${cells} Cell Note${cells === 1 ? '' : 's'}`)
    if (quick) segments.push(`${quick} Quick Note${quick === 1 ? '' : 's'}`)
    if (snapsWithDiagrams.has(snapId)) segments.push('Play Diagram')
    return segments.join(' · ')
  }
  const liveSelected = new Set(snaps.filter((snap) => selected.has(snap._id)).map((snap) => snap._id))
  const orphaned = useQuery(api.diagrams.countOrphanedBy, confirming ? { snapIds: [...liveSelected] } : 'skip')
  const remove = useMutation(api.snaps.removeMany).withOptimisticUpdate((store, args) => {
    const query = { sourceGameId: args.sourceGameId }
    const current = store.getQuery(api.snaps.listBySourceGame, query)
    const ids = new Set(args.snapIds)
    if (current) store.setQuery(api.snaps.listBySourceGame, query, current.filter((snap) => !ids.has(snap._id)))
  })
  const undo = useMutation(api.deletions.undo)
  const deleteSnaps = useUndoableMutation(({ snapIds, keepDiagrams }: { snapIds: Id<'snaps'>[]; keepDiagrams: boolean }) => remove({ sourceGameId, snapIds, keepDiagrams }),
    async (args) => { await undo(args) }, ({ snapIds }) => `Deleted ${snapIds.length} ${snapIds.length === 1 ? 'Snap' : 'Snaps'}`)
  const progress = new Map(snaps.map((snap) => [snap._id, chartingProgress(snap, columns, tree)]))
  const needsCharting = (snap: Doc<'snaps'>): boolean => {
    const { charted, total } = progress.get(snap._id)!
    return charted < total
  }
  const shown = [...snaps].reverse().filter((snap) => (!onlyReview || snap.mustReview) && (!onlyUncharted || needsCharting(snap)))
  const imports = importGroups(snaps)
  const shownSelected = shown.filter((snap) => liveSelected.has(snap._id)).length
  useEffect(() => {
    if (allCheckbox.current) allCheckbox.current.indeterminate = shownSelected > 0 && shownSelected < shown.length
  }, [shownSelected, shown.length])
  const count = pending ? selected.size : liveSelected.size
  const selectionLabel = `${count} ${count === 1 ? 'Snap' : 'Snaps'}`
  function runDelete(keepDiagrams: boolean): void {
    if (pending || orphaned === undefined || !liveSelected.size) return
    const snapIds = [...liveSelected]
    setSelected(new Set(snapIds)); setPending(true); setError('')
    void deleteSnaps({ snapIds, keepDiagrams }).then(() => {
      setConfirming(false); setSelected(new Set()); anchor.current = null
    }).catch((error: unknown) => {
      const message = `Could not delete Snaps. ${error instanceof Error ? error.message : String(error)}`
      setError(message); show({ message })
    }).finally(() => setPending(false))
  }
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
        onSelect: () => { setOnlyReview(false); setOnlyUncharted(false); setSelected(new Set(group.snapIds)); anchor.current = null },
      }))} />}
      <Button variant="outline" size="sm" aria-pressed={onlyUncharted} onClick={() => setOnlyUncharted((current) => !current)}
        className={cn('ml-auto h-7 bg-transparent text-[10.5px]', onlyUncharted && 'border-brand text-brand')}>
        {onlyUncharted ? 'Showing needs charting' : 'Needs charting'}
      </Button>
      <Button variant="outline" size="sm" aria-pressed={onlyReview} onClick={() => setOnlyReview((current) => !current)}
        className={cn('h-7 bg-transparent text-[10.5px]', onlyReview && 'border-warm text-warm')}>
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
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link className="underline" to={`${base}/import`}>Import Hudl file</Link>
          <Button variant="outline" size="sm" onClick={onChartSnap}>Chart a snap</Button>
        </div>
      </div> : <ul aria-label="Charted snaps" className="grid max-h-[640px] gap-1.5 overflow-y-auto pr-0.5">
          {shown.length === 0 && <li><Meta>No Snaps match these filters.</Meta></li>}
          {shown.map((snap) => {
            const { core } = snap
            const label = core.clipNumber ?? snap.order
            const indicators = indicatorText(snap._id)
            const zone = isValidYardLine(core.yardLine) ? fieldZoneOf(core.yardLine) : ''
            const { charted, total } = progress.get(snap._id)!
            return <li key={snap._id} className={cn('cursor-pointer rounded-[9px] border px-[11px] py-[9px]', snap._id === freshId
              ? 'border-primary/50 bg-primary/[0.07]'
              : 'border-border bg-muted/60 hover:border-muted-foreground/60')}
              onClick={(event) => { if (!(event.target as HTMLElement).closest('input, button, a')) onOpenSnap(snap._id) }}>
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
                <button type="button" onClick={() => onOpenSnap(snap._id)} aria-label={`Chart Snap ${label}: ${core.playType ?? 'no Play Type'}, ${core.formation ?? 'no Formation'}`}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Chip className="shrink-0 px-1.5 py-0.5 text-[10.5px]">{core.playType ?? '—'}</Chip>
                  <span className="min-w-0 truncate text-[14px] font-semibold text-foreground">{core.formation ?? '—'}</span>
                </button>
                {indicators && <Meta className="text-[10px]">{indicators}</Meta>}
                {snap.imported !== undefined && <Meta className="text-[10px]">Imported</Meta>}
                {total > 0 && <span className={cn('font-mono text-[10.5px]', charted < total ? 'text-brand' : 'text-muted-foreground')}>{charted}/{total} charted</span>}
                {snap.mustReview && <span className="text-warm" aria-label="Must Review">★</span>}
                <RowActions snap={snap} base={base} onDuplicated={onDuplicated} />
              </div>
              <div className="mt-1 truncate pl-6 font-mono text-[10.5px] text-muted-foreground">
                {[core.playConcept, downDistance(core), zone, core.personnel, resultText(core)].filter(Boolean).join(' · ') || '—'}
              </div>
            </li>
          })}
      </ul>}
    <Dialog open={confirming} onOpenChange={(open) => { if (!pending) setConfirming(open) }} aria-label={`Delete ${selectionLabel}?`}
      onCancel={(event) => { if (pending) event.preventDefault() }}>
      {confirming && <div className="space-y-4">
        <h2 className="text-lg font-semibold">Delete {selectionLabel}?</h2>
        {orphaned === undefined ? <p role="status">Checking for Play Diagrams…</p> : orphaned > 0
          ? <p>{orphaned} Play {orphaned === 1 ? 'Diagram is' : 'Diagrams are'} attached only to these Snaps. Keep the Play Diagrams?</p>
          : <p>Their Cell Notes and Quick Notes are soft-deleted with them. Undo restores them together.</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button autoFocus variant="outline" disabled={pending} onClick={() => setConfirming(false)}>Cancel</Button>
          {orphaned !== undefined && orphaned > 0
            ? <><Button disabled={pending} onClick={() => runDelete(true)}>Keep Play Diagrams</Button>
              <Button disabled={pending} onClick={() => runDelete(false)}>Delete Play Diagrams too</Button></>
            : <Button disabled={pending || orphaned === undefined || !liveSelected.size} onClick={() => runDelete(false)}>Delete {selectionLabel}</Button>}
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
