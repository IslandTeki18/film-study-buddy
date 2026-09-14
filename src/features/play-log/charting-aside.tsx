import type { ReactNode } from 'react'
import { Eyebrow, Panel } from '@/components/ui/panel'
import { PLAYERS, SPLIT_LABELS, TELLS, type Mode } from '../preview/preview-data'
import { PreviewBadge } from '../preview/preview-shared'

export function ChartingAside({ chartedCount, mustReviewCount, mode, onOpenPlayers }: {
  readonly chartedCount: number; readonly mustReviewCount: number; readonly mode: Mode
  readonly onOpenPlayers: () => void
}): ReactNode {
  const aPct = 0
  return (
    <aside className="grid min-w-0 flex-[1_1_300px] content-start gap-5 bg-card px-4.5 pt-4 pb-6">
      <div>
        <h3 className="mb-2.5"><Eyebrow>This week</Eyebrow></h3>
        <div className="grid grid-cols-2 gap-2">
          {[[chartedCount, 'Charted snaps'], [mustReviewCount, 'Must review'], [`${aPct}%`, `${SPLIT_LABELS[mode][0]} rate`], [TELLS[mode].length, 'Alerts']].map(([value, label], index) =>
            <Panel key={label} className="rounded-[9px] bg-muted/60 px-3 py-2.5">
              {index >= 2 && <PreviewBadge />}
              <div className="font-mono text-xl font-bold tracking-tight">{value}</div>
              <div className="mt-0.5 text-[9.5px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">{label}</div>
            </Panel>)}
        </div>
      </div>
      <div>
        <PreviewBadge />
        <h3 className="mb-2.5"><Eyebrow>Note a player</Eyebrow></h3>
        <Panel className="rounded-[10px] bg-muted/60 px-3 py-3">
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {PLAYERS[mode].flatMap((group) => group.players).map((player) => <button key={player.no} type="button" onClick={onOpenPlayers}
              className="rounded-md border border-border-strong bg-muted px-2.5 py-1.5 font-mono text-[11px] outline-none hover:border-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring">#{player.no}</button>)}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">Tap a number to open his card and add what you just saw. Notes carry the snap number and clip with them.</p>
        </Panel>
      </div>
      <div>
        <PreviewBadge />
        <h3 className="mb-2.5"><Eyebrow>Alerts forming</Eyebrow></h3>
        <div className="grid gap-2">
          {TELLS[mode].slice(0, 3).map((tell) => <Panel key={tell.tag} className="rounded-[9px] border-l-2 border-l-primary bg-muted/60 px-3 py-2.5">
            <div className="mb-1 font-mono text-[10.5px] text-brand">{tell.stat} snaps</div>
            <p className="text-[12.5px] leading-relaxed text-foreground/80">{tell.text}</p>
          </Panel>)}
        </div>
      </div>
    </aside>
  )
}
