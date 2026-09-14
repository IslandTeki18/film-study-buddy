import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Eyebrow, Meta, Panel } from '@/components/ui/panel'
import { cn } from '@/lib/utils'
import { CARDS, CORRECTIONS, FORMS, PLAYS, REPORTS, categoryRows, type Mode, type Report } from './preview-data'
import { MODE_OPTIONS, PreviewBadge, Segmented } from './preview-shared'

const STATUS_COLOR: Record<Report['status'], string> = {
  Ready: 'text-positive', 'Needs review': 'text-warm', Draft: 'text-muted-foreground', 'Not started': 'text-muted-foreground/70',
}

/** Reports tab on sample data. */
export function ReportsPreview(): ReactNode {
  const [mode, setMode] = useState<Mode>('off')
  const [reports, setReports] = useState(REPORTS)
  const ready = reports.filter((report) => report.status === 'Ready').length
  const reps = categoryRows(PLAYS[mode]).slice(0, 6)
  return <section className="grid min-w-0 gap-5 px-5 pt-5 pb-11">
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <h2 className="mb-1 text-xl font-bold tracking-tight">Reports</h2>
        <p className="text-[13px] text-muted-foreground">Built from what you charted. You decide when a report is ready to send.</p>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Segmented label="Which side of the ball" value={mode} options={MODE_OPTIONS} onChange={setMode} accent />
        <PreviewBadge />
        <span className="rounded-lg border border-border-strong bg-muted/60 px-3 py-2 font-mono text-[11.5px]">{ready} of {reports.length} ready</span>
      </div>
    </div>

    <div className="grid gap-2">
      {reports.map((report, index) => <Panel key={report.name} className="flex flex-wrap items-center gap-3 rounded-[10px] border-border-strong px-3.5 py-3">
        <input type="checkbox" aria-label={`Include ${report.name}`} checked={report.on}
          onChange={() => setReports((current) => current.map((item, i) => i === index ? { ...item, on: !item.on } : item))}
          className="size-5 shrink-0 cursor-pointer appearance-none rounded-md border border-border-strong outline-none checked:border-primary checked:bg-primary focus-visible:ring-2 focus-visible:ring-ring" />
        <div className="min-w-0 flex-[1_1_220px]">
          <div className="text-[13.5px]">{report.name}</div>
          <Meta className="mt-0.5 block text-[10.5px]">{report.who}</Meta>
        </div>
        <span className={cn('rounded-md border border-border-strong px-2 py-1 font-mono text-[10.5px]', STATUS_COLOR[report.status])}>{report.status}</span>
        <Button variant="outline" size="sm" className="h-8 text-foreground/80" disabled>Open</Button>
      </Panel>)}
    </div>

    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-4">
      <Panel className="overflow-hidden">
        <div className="border-b border-border px-4 py-3.5"><Eyebrow>Practice reps — by charted frequency</Eyebrow></div>
        {reps.map((row) => <div key={row.name} className="grid grid-cols-[minmax(0,1fr)_44px_62px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
          <div className="min-w-0">
            <div className="mb-1 text-[13px]">{row.name}</div>
            <div className="h-1.5 overflow-hidden rounded-sm bg-accent"><div className="h-full bg-primary" style={{ width: `${row.pct}%` }} /></div>
          </div>
          <div className="text-right font-mono text-[13px] font-bold">{Math.max(2, Math.round((row.pct / 100) * 48))}</div>
          <Meta className="text-right text-[10.5px]">{row.pct}%</Meta>
        </div>)}
      </Panel>
      <Panel className="px-4.5 pt-4 pb-4.5">
        <h3 className="mb-3"><Eyebrow>Player corrections</Eyebrow></h3>
        <div className="grid gap-2.5">
          {CORRECTIONS[mode].map((correction) => <div key={correction.src} className="flex items-start gap-3">
            <span className="shrink-0 rounded-md bg-muted-foreground px-1.5 py-0.5 font-mono text-[11px] font-bold text-background">{correction.who}</span>
            <div className="min-w-0">
              <p className="text-[12.5px] leading-normal">{correction.what}</p>
              <Meta className="mt-0.5 block text-[10.5px]">{correction.src}</Meta>
            </div>
          </div>)}
        </div>
      </Panel>
    </div>

    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h3><Eyebrow>Scout-team cards</Eyebrow></h3>
        <Meta>{mode === 'off' ? 'From your most-charted formations and concepts' : 'From your most-charted fronts, coverages and pressures'}</Meta>
        <Button variant="outline" size="sm" className="ml-auto h-8 text-foreground/80" disabled>Print 8.5×11</Button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(272px,1fr))] gap-3.5">
        {CARDS[mode].map((card, index) => <Panel key={card.title} className="min-w-0 overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
            <span className="rounded-md bg-primary px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary-foreground">{String(index + 1).padStart(2, '0')}</span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight">{card.title}</div>
              <Meta className="text-[10.5px]">{card.meta}</Meta>
            </div>
            <Meta className="ml-auto text-foreground/80">{14 - index * 2} reps</Meta>
          </div>
          <div aria-hidden="true" className="relative h-[126px] bg-[#14201a] bg-[repeating-linear-gradient(90deg,#1b2c22_0_1px,transparent_1px_44px)]">
            <div className="absolute inset-x-0 top-1/2 h-px bg-[#26402f]" />
            {FORMS[card.players].map(([x, y, shape], i) => <div key={i}
              className={cn('absolute size-[11px] -translate-x-1/2 -translate-y-1/2', shape === 's' ? 'rounded-[2px] bg-foreground/90' : 'rounded-full bg-brand')}
              style={{ left: `${x}%`, top: `${y}%` }} />)}
          </div>
          <dl className="grid gap-1.5 px-4 pt-3 pb-3.5">
            {card.notes.map(([key, value]) => <div key={key} className="grid grid-cols-[62px_minmax(0,1fr)] items-baseline gap-2">
              <dt className="font-mono text-[9.5px] tracking-[0.07em] text-muted-foreground uppercase">{key}</dt>
              <dd className="text-[12.5px] leading-normal text-foreground/80">{value}</dd>
            </div>)}
          </dl>
        </Panel>)}
      </div>
    </div>
  </section>
}
