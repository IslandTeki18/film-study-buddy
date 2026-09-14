import { useState, type ReactNode } from 'react'
import { Eyebrow, Meta, Panel } from '@/components/ui/panel'
import { DD_TAGS, PLAYS, SPLIT_LABELS, TELLS, ZONE_TAGS, categoryRows, isA, type Mode } from './preview-data'
import { MODE_OPTIONS, PreviewBadge, Segmented, SplitBar } from './preview-shared'

/** Tendencies tab on sample data. */
export function TendenciesPreview(): ReactNode {
  const [mode, setMode] = useState<Mode>('off')
  const plays = PLAYS[mode]
  const [aName, bName] = SPLIT_LABELS[mode]
  const split = (subset: readonly typeof plays[number][]): number => subset.length ? Math.round((subset.filter((play) => isA(mode, play)).length / subset.length) * 100) : 0
  const ddRows = DD_TAGS.slice(0, 6).map((dd) => {
    const set = plays.filter((play) => play.dd === dd)
    const counts = new Map<string, number>()
    for (const play of set) counts.set(play.call, (counts.get(play.call) ?? 0) + 1)
    const top = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
    return { dd, count: set.length, pct: split(set), top }
  }).filter((row) => row.count > 0)
  const zoneRows = ZONE_TAGS.slice(0, 5).map((zone) => {
    const set = plays.filter((play) => play.zone === zone)
    return { zone, count: set.length, pct: split(set) }
  }).filter((row) => row.count > 0)
  const cats = categoryRows(plays)
  return <section className="grid min-w-0 gap-6 px-5 pt-5 pb-11">
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <h2 className="mb-1 text-xl font-bold tracking-tight">{mode === 'off' ? 'Offensive' : 'Defensive'} tendencies</h2>
        <p className="text-[13px] text-muted-foreground">{plays.length} charted snaps from sample film</p>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Segmented label="Which side of the ball" value={mode} options={MODE_OPTIONS} onChange={setMode} accent />
        <PreviewBadge />
      </div>
    </div>

    <Panel className="px-4.5 pt-4 pb-5">
      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <h3><Eyebrow>Alerts</Eyebrow></h3>
        <Meta>{TELLS[mode].length} from charted data</Meta>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
        {TELLS[mode].map((tell) => <Panel key={tell.tag} className="rounded-[10px] border-border-strong bg-muted/60 px-4 py-3">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="rounded-md bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.06em] text-brand">{tell.tag}</span>
            <Meta>{tell.stat}</Meta>
          </div>
          <p className="text-[13.5px] leading-normal">{tell.text}</p>
          <p className="mt-2 text-xs leading-normal text-muted-foreground">{tell.answer}</p>
        </Panel>)}
      </div>
    </Panel>

    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
      <Panel className="min-w-0 px-4.5 pt-4 pb-4.5">
        <h3 className="mb-3.5"><Eyebrow>By down &amp; distance</Eyebrow></h3>
        <div className="grid gap-3">
          {ddRows.map((row) => <div key={row.dd}>
            <div className="mb-1 flex items-baseline gap-2">
              <span className="min-w-[88px] font-mono text-xs text-foreground/80">{row.dd}</span>
              <Meta className="text-[10.5px]">{row.count} {row.count === 1 ? 'snap' : 'snaps'}</Meta>
              <Meta className="ml-auto">{row.top}</Meta>
            </div>
            <SplitBar aPct={row.pct} height="h-5" labels={[aName, bName]} />
          </div>)}
        </div>
      </Panel>

      <Panel className="min-w-0 px-4.5 pt-4 pb-4.5">
        <h3 className="mb-3.5"><Eyebrow>{mode === 'off' ? 'Formation' : 'Coverage'} frequency</Eyebrow></h3>
        <div className="grid gap-2.5">
          {cats.map((row) => <div key={row.name} className="grid grid-cols-[minmax(0,1fr)_46px_62px] items-center gap-2.5">
            <div className="min-w-0">
              <div className="mb-1 truncate text-[12.5px]">{row.name}</div>
              <div className="h-1.5 overflow-hidden rounded-sm bg-accent"><div className="h-full bg-primary" style={{ width: `${row.width}%` }} /></div>
            </div>
            <div className="text-right font-mono text-xs text-foreground/80">{row.pct}%</div>
            <Meta className="text-right text-[10.5px]">{row.avg}</Meta>
          </div>)}
        </div>
      </Panel>

      <Panel className="min-w-0 px-4.5 pt-4 pb-4.5">
        <h3 className="mb-3.5"><Eyebrow>By field zone</Eyebrow></h3>
        <div className="grid gap-3">
          {zoneRows.map((row) => <div key={row.zone} className="grid grid-cols-[96px_minmax(0,1fr)_40px] items-center gap-2.5">
            <span className="font-mono text-[11.5px] text-foreground/80">{row.zone}</span>
            <SplitBar aPct={row.pct} />
            <Meta className="text-right text-[10.5px]">{row.count}</Meta>
          </div>)}
        </div>
        <div className="mt-4 flex gap-3.5 border-t border-border pt-3">
          {([[aName, 'bg-warm'], [bName, 'bg-primary']] as const).map(([label, color]) => <Meta key={label} className="flex items-center gap-1.5 text-[10.5px]">
            <span className={`size-[9px] rounded-[3px] ${color}`} />{label}
          </Meta>)}
        </div>
      </Panel>
    </div>
  </section>
}
