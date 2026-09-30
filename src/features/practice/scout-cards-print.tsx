import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { cardNumbers } from '@convex/domain/practiceScript'
import { pdfFileName } from '@convex/domain/reportBlocks'
import { DiagramSvg } from '@/components/diagram-svg'
import { Button } from '@/components/ui/button'
import { usePdfExport } from '@/lib/use-pdf-export'

const LANDSCAPE = '@page { size: letter landscape; margin: 0.4in; }'

export function ScoutCardsPrint({ workspaceId, scriptId }: { readonly workspaceId: string; readonly scriptId: string }): ReactNode {
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const script = useQuery(api.practiceScripts.get, { workspaceId, scriptId })
  const cards = useQuery(api.practiceScripts.cards, { workspaceId })
  const { pending, available, exportPdf } = usePdfExport()
  if (workspace === undefined || script === undefined || cards === undefined) return <div role="status" aria-label="Loading Scout Cards" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!workspace || !script) return <div className="space-y-3 p-6"><h1>Practice Script not found</h1><Link className="underline" to={`/w/${workspaceId}/practice`}>Practice Scripts</Link></div>
  const live = new Map(cards.map((card) => [card.diagramId, card]))
  const ordered = [...cardNumbers(script.periods, (id) => live.has(id))].flatMap(([diagramId, number]) => {
    const card = live.get(diagramId)
    return card ? [{ card, number }] : []
  })
  return <>
    <style>{LANDSCAPE}</style>
    <div className="flex flex-wrap items-center gap-4 px-6 pt-6 print:hidden">
      <Link className="underline" to={`/w/${workspaceId}/practice/${scriptId}`}>Back to Script</Link>
      <Button disabled={pending || !available || ordered.length === 0} onClick={() => { void exportPdf(pdfFileName({ opponentName: workspace.opponentName, week: workspace.week, reportName: `${script.name} Scout Cards` })) }}>{pending ? 'Exporting…' : 'Export PDF'}</Button>
      {!available && <p>PDF export requires the desktop app</p>}
    </div>
    {ordered.length === 0 && <p className="p-6">Add reps to this Practice Script to print Scout Cards.</p>}
    <article data-report-ready className="report-sheet mx-auto my-6 w-[11in] shrink-0 print:m-0 print:w-auto">
      {ordered.map(({ card, number }) => <section key={card.diagramId} className="report-avoid-break flex h-[7.7in] break-after-page flex-col gap-3 p-[0.4in] print:p-0">
        <header className="flex items-baseline gap-4"><span className="text-6xl font-bold">{number}</span><h2 className="text-3xl font-bold">{card.title}</h2></header>
        <DiagramSvg diagram={card} title={card.title} className="min-h-0 w-full flex-1" {...(card.hiddenSide ? { hideSide: card.hiddenSide } : {})} />
        <p className="text-lg">{card.facts.snaps === 0 ? 'No charted snaps attached' : card.facts.top.map((fact) => `${fact.label}: ${fact.value} (${fact.count}/${card.facts.snaps})`).join(' · ')}</p>
      </section>)}
    </article>
  </>
}
