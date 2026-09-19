import { useState, type ReactNode } from 'react'
import { useQuery } from 'convex/react'
import { Link } from 'react-router'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { Eyebrow, Meta, Panel } from '@/components/ui/panel'
import { SPLIT_LABELS, TELLS, type Mode } from '../preview/preview-data'
import { PreviewBadge } from '../preview/preview-shared'

type ThisWeekProps = {
  readonly workspaceId: Id<'workspaces'>
  readonly sourceGameId: Id<'sourceGames'>
  readonly snaps: readonly Doc<'snaps'>[]
  readonly mode: Mode
}

type FrequencyRow = {
  readonly name: string
  readonly count: number
  readonly sharePct: number
  readonly barPct: number
  readonly avgYards: string
}

function frequencyRows(snaps: readonly Doc<'snaps'>[], by: 'form' | 'call'): FrequencyRow[] {
  const groups = new Map<string, { count: number; yards: number[] }>()
  for (const snap of snaps) {
    const value = by === 'form' ? snap.core.formation : snap.core.playConcept
    const name = value?.trim() || '—'
    const group = groups.get(name) ?? { count: 0, yards: [] }
    group.count += 1
    if (snap.core.yards !== undefined) group.yards.push(snap.core.yards)
    groups.set(name, group)
  }
  const maxCount = Math.max(1, ...[...groups.values()].map((group) => group.count))
  return [...groups].map(([name, group]) => ({
    name,
    count: group.count,
    sharePct: Math.round(group.count / snaps.length * 100),
    barPct: Math.round(group.count / maxCount * 100),
    avgYards: group.yards.length > 0
      ? `${(group.yards.reduce((sum, yards) => sum + yards, 0) / group.yards.length).toFixed(1)} yds`
      : '—',
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 7)
}

export function ThisWeek({ workspaceId, sourceGameId, snaps, mode }: ThisWeekProps): ReactNode {
  const games = useQuery(api.sourceGames.listByWorkspace, { workspaceId })
  const [freqBy, setFreqBy] = useState<'form' | 'call'>('form')
  const reviewCount = snaps.filter((snap) => snap.mustReview).length
  const aPct = 0
  const rows = frequencyRows(snaps, freqBy)
  const included = games?.filter((game) => game.included !== false) ?? [] // Matches sourceGames.isIncluded.
  const total = included.reduce((sum, game) => sum + game.snapCount, 0)
  const max = Math.max(1, ...included.map((game) => game.snapCount))
  return <section aria-labelledby="this-week-heading" className="mt-[26px] grid gap-[18px]">
    <div className="flex flex-wrap items-baseline gap-3">
      <h2 id="this-week-heading"><Eyebrow className="text-xs">This week</Eyebrow></h2>
      <Meta>{snaps.length} snaps charted · {reviewCount} must review</Meta>
    </div>
    <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
      {[[snaps.length, 'Charted snaps'], [reviewCount, 'Must review'], [`${aPct}%`, `${SPLIT_LABELS[mode][0]} rate`], [TELLS[mode].length, 'Alerts']].map(([value, label], index) =>
        <Panel key={label} className="rounded-[9px] bg-muted/60 px-[13px] py-3">
          {index >= 2 && <PreviewBadge />}
          <div className="font-mono text-2xl font-bold tracking-tight">{value}</div>
          <div className="mt-0.5 text-[9.5px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">{label}</div>
        </Panel>)}
    </div>
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-3.5">
      <Panel className="min-w-0 rounded-xl bg-card px-4 pt-3.5 pb-4">
        <div className="mb-3 flex flex-wrap items-baseline gap-2">
          <h3><Eyebrow>Charting progress</Eyebrow></h3>
          {games !== undefined && <Meta className="text-[10.5px]">
            {total} {total === 1 ? 'Snap' : 'Snaps'} · {included.length} included {included.length === 1 ? 'Source Game' : 'Source Games'}
          </Meta>}
        </div>
        {games === undefined ? <div role="status" aria-label="Loading Charting progress" className="h-24 animate-pulse rounded bg-muted" />
          : <div className="grid gap-2.5">{games.map((game) => {
            const isIncluded = game.included !== false // Matches sourceGames.isIncluded.
            return <Link key={game._id} to={`/w/${workspaceId}/games/${game._id}`} aria-current={game._id === sourceGameId ? 'page' : undefined}
              className={`-mx-2.5 block rounded-lg px-2.5 py-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring${isIncluded ? '' : ' opacity-50'}`}>
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground/90">{game.label}</span>
                <span className={`font-mono text-[11px] ${isIncluded ? game.snapCount > 0 ? 'text-foreground' : 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                  {isIncluded ? game.snapCount : 'off'}
                </span>
              </div>
              <div aria-hidden className="mt-1.5 h-1.5 overflow-hidden rounded-[3px] bg-accent">
                <div className={`h-full ${isIncluded ? 'bg-primary' : 'bg-border-strong'}`} style={{ width: `${Math.round(game.snapCount / max * 100)}%` }} />
              </div>
            </Link>
          })}</div>}
      </Panel>
      <Panel className="min-w-0 rounded-xl bg-card px-4 pt-3.5 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3><Eyebrow>{freqBy === 'form' ? 'Formation' : 'Concept'} frequency</Eyebrow></h3>
          <Meta className="text-[10.5px]">{snaps.length} snaps</Meta>
          <div className="ml-auto flex gap-1">
            {([['form', 'Formation'], ['call', 'Concept']] as const).map(([key, label]) => <button key={key} type="button"
              aria-pressed={freqBy === key} onClick={() => setFreqBy(key)} className={`rounded-md border px-2 py-1 font-mono text-[10px] outline-none focus-visible:ring-2 focus-visible:ring-ring ${freqBy === key
                ? 'border-border-strong bg-muted text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{label}</button>)}
          </div>
        </div>
        {snaps.length === 0 ? <p className="mt-3 text-xs text-muted-foreground">No Snaps charted yet.</p>
          : <div className="mt-3 grid gap-[9px]">{rows.map((row) => <div key={row.name} className="grid grid-cols-[minmax(0,1fr)_40px_56px] items-center gap-2.5">
            <div className="min-w-0">
              <div className="truncate text-[12.5px] text-foreground/90">{row.name}</div>
              <div aria-hidden className="mt-1 h-1.5 overflow-hidden rounded-[3px] bg-accent"><div className="h-full bg-primary" style={{ width: `${row.barPct}%` }} /></div>
            </div>
            <div className="text-right font-mono text-[11.5px] text-foreground">{row.sharePct}%</div>
            <div className="text-right font-mono text-[10.5px] text-muted-foreground">{row.avgYards}</div>
          </div>)}</div>}
      </Panel>
    </div>
  </section>
}
