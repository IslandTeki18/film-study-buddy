import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { fieldZoneOf, isValidYardLine } from '@convex/domain/fieldZone'
import { Button } from '@/components/ui/button'
import { Eyebrow, Meta } from '@/components/ui/panel'
import { cn } from '@/lib/utils'
import { RowActions } from './row-actions'

export const LOG_GRID = 'grid grid-cols-[52px_30px_100px_minmax(76px,1fr)_52px_minmax(100px,1fr)_minmax(108px,1.25fr)_88px_32px] items-center gap-2 px-3'
export const LOG_HEADERS = ['#', '★', 'D&D', 'Zone', 'Pers', 'Form', 'Call', 'Result']
const cell = 'truncate font-mono text-[11.5px] text-foreground/80'

export function ChartedSnaps({ snaps, freshId, base, onDuplicated }: {
  readonly snaps: readonly Doc<'snaps'>[]
  readonly freshId: Id<'snaps'> | null
  readonly base: string
  readonly workspaceId: string
  readonly sourceGameId: Id<'sourceGames'>
  readonly onDuplicated: (id: Id<'snaps'>) => void
}): ReactNode {
  const [onlyReview, setOnlyReview] = useState(false)
  const reviewCount = snaps.filter((snap) => snap.mustReview).length
  const shown = [...snaps].reverse().filter((snap) => !onlyReview || snap.mustReview)
  return <div className="mt-6">
    <div className="mb-2.5 flex flex-wrap items-center gap-3">
      <h2><Eyebrow className="text-xs">Charted snaps</Eyebrow></h2>
      <Meta>{snaps.length} charted · {reviewCount} must review</Meta>
      <Button variant="outline" size="sm" aria-pressed={onlyReview} onClick={() => setOnlyReview((current) => !current)}
        className={cn('ml-auto h-7 bg-transparent text-[10.5px]', onlyReview && 'border-warm text-warm')}>
        {onlyReview ? 'Showing must review only' : 'Show must review only'}
      </Button>
    </div>
    <div className="overflow-x-auto rounded-[10px] border border-border">
      {snaps.length === 0 ? <div className="px-4 py-6">
        <h2 className="font-semibold">No Snaps yet</h2>
        <Link className="underline" to={`${base}/import`}>Import Hudl CSV</Link>
      </div> : <div role="table" aria-label="Charted snaps" className="min-w-[740px]">
        <div role="rowgroup">
          <div role="row" className={cn(LOG_GRID, 'bg-muted py-2 font-mono text-[9.5px] tracking-[0.06em] text-muted-foreground uppercase')}>
            {LOG_HEADERS.map((label, index) =>
              <div role="columnheader" key={label} className={cn(index === 1 && 'text-center', index === 7 && 'text-right')}>{label}</div>)}
            <div role="columnheader"><span className="sr-only">Snap actions</span></div>
          </div>
        </div>
        <div role="rowgroup" className="max-h-[340px] overflow-y-auto">
          {shown.map((snap) => {
            const { core } = snap
            const label = core.clipNumber ?? snap.order
            return <div role="row" key={snap._id} className={cn(LOG_GRID, 'border-t border-border py-2', snap._id === freshId && 'bg-primary/10')}>
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
