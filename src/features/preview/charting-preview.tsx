import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Chip, Eyebrow, Meta, Panel } from '@/components/ui/panel'
import { cn } from '@/lib/utils'
import { GROUPS, HEAD_LABELS, PLAYERS, PLAYS, SPLIT_LABELS, TAGS, TAG_SUB, TELLS, isA, type Field, type Mode, type Play } from './preview-data'
import { MODE_OPTIONS, PreviewBadge, Segmented } from './preview-shared'

type Draft = Partial<Record<Field, string>>
const LOG_GRID = 'grid grid-cols-[52px_30px_100px_minmax(76px,1fr)_52px_minmax(100px,1fr)_minmax(108px,1.25fr)_88px] items-center gap-2 px-3'

/** Opponent data tab: the charting palette and the player notes, on sample data. */
export function ChartingPreview(): ReactNode {
  const [mode, setMode] = useState<Mode>('off')
  const [dataTab, setDataTab] = useState<'charting' | 'players'>('charting')
  return <div className="grid">
    <div className="flex flex-wrap items-center gap-3 px-5 pt-3.5">
      <Segmented label="Opponent data section" value={dataTab} options={[['charting', 'Charting'], ['players', 'Player notes']]} onChange={setDataTab} />
      <Segmented label="Which side of the ball" value={mode} options={MODE_OPTIONS} onChange={(next) => setMode(next)} accent />
      <span className="ml-auto"><PreviewBadge /></span>
    </div>
    {dataTab === 'charting' ? <Charting key={mode} mode={mode} onOpenPlayers={() => setDataTab('players')} /> : <PlayerNotes mode={mode} />}
  </div>
}

function Charting({ mode, onOpenPlayers }: { readonly mode: Mode; readonly onOpenPlayers: () => void }): ReactNode {
  const groups = GROUPS[mode]
  const [layout, setLayout] = useState<'focus' | 'all'>('focus')
  const [groupIdx, setGroupIdx] = useState(0)
  const [draft, setDraft] = useState<Draft>({})
  const [mustReview, setMustReview] = useState(false)
  const [onlyReview, setOnlyReview] = useState(false)
  const [extra, setExtra] = useState<readonly Play[]>([])
  const plays = [...PLAYS[mode], ...extra]
  const active = groups[groupIdx] ?? groups[0]!
  const reviewCount = plays.filter((play) => play.review).length
  const aPct = plays.length ? Math.round((plays.filter((play) => isA(mode, play)).length / plays.length) * 100) : 0

  function pick(field: Field, tag: string): void {
    setDraft((current) => ({ ...current, [field]: current[field] === tag ? undefined : tag }))
    const index = groups.findIndex((group) => group.field === field)
    if (draft[field] !== tag && index === groupIdx) setGroupIdx(Math.min(groups.length - 1, groupIdx + 1))
  }
  function clear(): void { setDraft({}); setGroupIdx(0); setMustReview(false) }
  function save(): void {
    if (!draft.dd && !draft.call) return
    const value = (field: Field): string => draft[field] ?? '—'
    setExtra((current) => [...current, {
      n: plays.length + 1, dd: value('dd'), zone: value('zone'), pers: value('pers'), form: value('form'),
      motion: value('motion'), call: value('call'), result: value('result'), gain: 0, review: mustReview, fresh: true,
    }])
    clear()
  }
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      const target = event.target
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return
      if (event.key === 'Enter') { event.preventDefault(); save(); return }
      if (event.key === 'Tab') { event.preventDefault(); setGroupIdx((current) => (current + 1) % groups.length); return }
      const digit = Number.parseInt(event.key, 10)
      const tag = digit >= 1 && digit <= 9 ? TAGS[mode][active.field][digit - 1] : undefined
      if (tag) { event.preventDefault(); pick(active.field, tag) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const shown = (onlyReview ? plays.filter((play) => play.review) : plays).slice().reverse()
  const cell = 'truncate font-mono text-[11.5px] text-foreground/80'
  return <div className="mt-3.5 flex flex-wrap items-stretch gap-px bg-border">
    <section className="min-w-0 flex-[1_1_620px] bg-background px-5 pt-4 pb-6">
      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <h2><Eyebrow className="text-xs">Chart a snap</Eyebrow></h2>
        <Meta>Click to chart — it advances to the next field · 1-9 picks, Tab next group, Enter saves</Meta>
        <span className="ml-auto"><Segmented label="Palette layout" value={layout} options={[['focus', 'One group'], ['all', 'All groups']]} onChange={setLayout} /></span>
      </div>

      {layout === 'focus' ? <div className="flex flex-wrap items-start gap-3.5">
        <div role="tablist" aria-label="Field groups" className="grid min-w-0 flex-[0_0_176px] gap-1">
          {groups.map((group, index) => {
            const value = draft[group.field]
            return <button key={group.field} type="button" role="tab" aria-selected={index === groupIdx} onClick={() => setGroupIdx(index)}
              className={cn('flex flex-col items-start gap-0.5 rounded-[9px] border px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
                index === groupIdx ? 'border-brand/50 bg-accent text-foreground' : 'border-border bg-card text-muted-foreground')}>
              <span className="text-[11px] font-semibold tracking-[0.07em] uppercase">{group.name}</span>
              <span className={cn('font-mono text-[11.5px]', value ? 'text-brand' : 'text-muted-foreground')}>{value ?? 'not charted'}</span>
            </button>
          })}
        </div>
        <div className="min-w-0 flex-[1_1_320px] rounded-xl border border-brand/40 bg-accent px-4 py-3.5">
          <div className="mb-3 flex items-center justify-between">
            <Eyebrow className="text-foreground/70">{active.name}</Eyebrow>
            <Meta className="text-[10.5px]">{TAGS[mode][active.field].length} tags · {draft[active.field] ?? 'nothing picked'}</Meta>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(128px,1fr))] gap-2">
            {TAGS[mode][active.field].map((tag, index) => {
              const selected = draft[active.field] === tag
              return <button key={tag} type="button" aria-pressed={selected} onClick={() => pick(active.field, tag)}
                className={cn('flex min-h-[66px] flex-col items-start justify-between gap-2 rounded-[10px] border px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong bg-muted hover:border-muted-foreground/60')}>
                <span className="text-sm leading-tight font-semibold">{tag}</span>
                <span className={cn('font-mono text-[10px] tracking-[0.04em]', selected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {index < 9 ? `${index + 1} · ` : ''}{TAG_SUB[tag] ?? ''}
                </span>
              </button>
            })}
          </div>
        </div>
      </div> : <div className="grid gap-2.5">
        {groups.map((group, index) => {
          const value = draft[group.field]
          return <div key={group.field} className={cn('rounded-[11px] border px-3.5 py-3', index === groupIdx ? 'border-brand/50 bg-accent' : 'border-border bg-card')}>
            <div className="mb-2 flex items-center justify-between">
              <Eyebrow className="text-[10.5px] text-foreground/70">{group.name}</Eyebrow>
              <span className={cn('rounded-md px-1.5 py-0.5 font-mono text-[10px] tracking-[0.05em]', value ? 'bg-primary font-bold text-primary-foreground' : 'bg-primary/15 text-brand')}>
                {value ?? (index === groupIdx ? 'active' : '')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TAGS[mode][group.field].map((tag) => {
                const selected = value === tag
                return <button key={tag} type="button" aria-pressed={selected} onClick={() => pick(group.field, tag)}
                  className={cn('rounded-lg border px-2.5 py-1.5 font-mono text-[11.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected ? 'border-primary bg-primary font-bold text-primary-foreground' : 'border-border-strong bg-muted text-foreground/80 hover:border-muted-foreground/60')}>
                  {tag}
                </button>
              })}
            </div>
          </div>
        })}
      </div>}

      <Panel className="mt-4.5 border-border-strong bg-muted/60 px-4 py-3.5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Eyebrow className="text-[10.5px] text-foreground/70">Snap {String(plays.length + 1).padStart(2, '0')}</Eyebrow>
          <Meta>{Object.values(draft).filter(Boolean).length} of {groups.length} fields</Meta>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" aria-pressed={mustReview} onClick={() => setMustReview((current) => !current)}
              className={cn('h-8 bg-transparent', mustReview && 'border-warm bg-warm text-primary-foreground hover:bg-warm hover:text-primary-foreground')}>
              {mustReview ? '★' : '☆'} Must review
            </Button>
            <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={clear}>Clear</Button>
            <Button size="sm" className="h-8 font-mono text-[11px] font-bold" onClick={save} disabled={!draft.dd && !draft.call}>Save snap</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {groups.map((group, index) => {
            const value = draft[group.field]
            return <button key={group.field} type="button" onClick={() => setGroupIdx(index)}
              className={cn('min-w-[104px] rounded-lg border px-2.5 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring', value ? 'border-solid border-brand/50' : 'border-dashed border-border-strong')}>
              <div className="mb-0.5 text-[9px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{group.name}</div>
              <div className={cn('font-mono text-xs', value ? 'text-foreground' : 'text-muted-foreground')}>{value ?? '—'}</div>
            </button>
          })}
        </div>
      </Panel>

      <div className="mt-6">
        <div className="mb-2.5 flex flex-wrap items-center gap-3">
          <h2><Eyebrow className="text-xs">Charted snaps</Eyebrow></h2>
          <Meta>{plays.length} charted · {reviewCount} must review</Meta>
          <Button variant="outline" size="sm" aria-pressed={onlyReview} onClick={() => setOnlyReview((current) => !current)}
            className={cn('ml-auto h-7 bg-transparent text-[10.5px]', onlyReview && 'border-warm text-warm')}>
            {onlyReview ? 'Showing must review only' : 'Show must review only'}
          </Button>
        </div>
        <div className="overflow-x-auto rounded-[10px] border border-border">
          <div className="min-w-[700px]">
            <div className={cn(LOG_GRID, 'bg-muted py-2 font-mono text-[9.5px] tracking-[0.06em] text-muted-foreground uppercase')}>
              {HEAD_LABELS[mode].map((label, index) => <div key={label} className={cn(index === 1 && 'text-center', index === 7 && 'text-right')}>{label}</div>)}
            </div>
            <div className="max-h-[340px] overflow-y-auto">
              {shown.map((play) => <div key={play.n} className={cn(LOG_GRID, 'border-t border-border py-2', play.fresh && 'bg-primary/10')}>
                <div className={cn(cell, 'text-muted-foreground')}>{play.n}</div>
                <div className={cn(cell, 'text-center text-warm')}>{play.review ? '★' : ''}</div>
                <div className={cell}>{play.dd}</div>
                <div className={cn(cell, 'text-muted-foreground')}>{play.zone}</div>
                <div className={cell}>{play.pers}</div>
                <div className={cell}>{play.form}</div>
                <div className={cn(cell, 'text-foreground')}>{play.call}</div>
                <div className={cn(cell, 'text-right text-muted-foreground')}>{play.result}</div>
              </div>)}
            </div>
          </div>
        </div>
      </div>
    </section>

    <aside className="grid min-w-0 flex-[1_1_300px] content-start gap-5 bg-card px-4.5 pt-4 pb-6">
      <div>
        <h3 className="mb-2.5"><Eyebrow>This week</Eyebrow></h3>
        <div className="grid grid-cols-2 gap-2">
          {[[plays.length, 'Charted snaps'], [reviewCount, 'Must review'], [`${aPct}%`, `${SPLIT_LABELS[mode][0]} rate`], [TELLS[mode].length, 'Alerts']].map(([value, label]) =>
            <Panel key={label} className="rounded-[9px] bg-muted/60 px-3 py-2.5">
              <div className="font-mono text-xl font-bold tracking-tight">{value}</div>
              <div className="mt-0.5 text-[9.5px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">{label}</div>
            </Panel>)}
        </div>
      </div>
      <div>
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
        <h3 className="mb-2.5"><Eyebrow>Alerts forming</Eyebrow></h3>
        <div className="grid gap-2">
          {TELLS[mode].slice(0, 3).map((tell) => <Panel key={tell.tag} className="rounded-[9px] border-l-2 border-l-primary bg-muted/60 px-3 py-2.5">
            <div className="mb-1 font-mono text-[10.5px] text-brand">{tell.stat} snaps</div>
            <p className="text-[12.5px] leading-relaxed text-foreground/80">{tell.text}</p>
          </Panel>)}
        </div>
      </div>
    </aside>
  </div>
}

function PlayerNotes({ mode }: { readonly mode: Mode }): ReactNode {
  return <section className="grid min-w-0 gap-5 px-5 pt-4 pb-11">
    <p className="text-[13px] text-muted-foreground">Grouped by position. Every note carries the snap and clip it came from.</p>
    {PLAYERS[mode].map((group) => <div key={group.abbr} className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-3 border-b border-border pb-2">
        <span className="rounded-md bg-primary px-2 py-0.5 font-mono text-[13px] font-bold text-primary-foreground">{group.abbr}</span>
        <span className="text-[15px] font-semibold tracking-tight">{group.name}</span>
        <Meta>{group.players.length} charted</Meta>
        <span className="ml-auto text-[12.5px] text-muted-foreground">{group.summary}</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
        {group.players.map((player) => <Panel key={player.no} className="grid min-w-0 content-start gap-2.5 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-foreground/80 px-2 py-1 font-mono text-base font-bold text-background">{player.no}</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-tight">{player.pos}</div>
              <Meta className="text-[10.5px]">{player.meta}</Meta>
            </div>
            <span className={cn('ml-auto flex size-[26px] items-center justify-center rounded-lg border font-mono text-xs font-bold',
              player.grade === 'A' ? 'border-warm bg-warm text-primary-foreground' : 'border-border-strong text-foreground/80')}>{player.grade}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">{player.traits.map((trait) => <Chip key={trait} className="px-2 py-1 text-[10px]">{trait}</Chip>)}</div>
          <p className="text-[12.5px] leading-normal">{player.note}</p>
          <dl className="grid gap-1.5 border-t border-border pt-2.5">
            {([['Tendency', player.tell], ['Our job', player.assign], ['Clips', player.clips]] as const).map(([key, value]) =>
              <div key={key} className="grid grid-cols-[70px_minmax(0,1fr)] items-baseline gap-2">
                <dt className="font-mono text-[9.5px] tracking-[0.07em] text-muted-foreground uppercase">{key}</dt>
                <dd className={cn('text-xs leading-normal text-foreground/80', key === 'Clips' && 'font-mono text-[11px] text-brand')}>{value}</dd>
              </div>)}
          </dl>
        </Panel>)}
      </div>
    </div>)}
  </section>
}
