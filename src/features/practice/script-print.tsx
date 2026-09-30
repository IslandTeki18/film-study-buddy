import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { cardNumbers, formatDownDistance } from '@convex/domain/practiceScript'
import { pdfFileName } from '@convex/domain/reportBlocks'
import { Button } from '@/components/ui/button'
import { usePdfExport } from '@/lib/use-pdf-export'

export function ScriptPrint({ workspaceId, scriptId }: { readonly workspaceId: string; readonly scriptId: string }): ReactNode {
  const workspace = useQuery(api.workspaces.get, { workspaceId })
  const script = useQuery(api.practiceScripts.get, { workspaceId, scriptId })
  const cards = useQuery(api.practiceScripts.cards, { workspaceId })
  const { pending, available, exportPdf } = usePdfExport()
  if (workspace === undefined || script === undefined || cards === undefined) return <div role="status" aria-label="Loading Practice Script" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!workspace || !script) return <div className="space-y-3 p-6"><h1>Practice Script not found</h1><Link className="underline" to={`/w/${workspaceId}/practice`}>Practice Scripts</Link></div>
  const live = new Map(cards.map((card) => [card.diagramId, card]))
  const numbers = cardNumbers(script.periods, (id) => live.has(id))
  return <>
    <div className="flex flex-wrap items-center gap-4 px-6 pt-6 print:hidden">
      <Link className="underline" to={`/w/${workspaceId}/practice/${scriptId}`}>Back to Script</Link>
      <Button disabled={pending || !available} onClick={() => { void exportPdf(pdfFileName({ opponentName: workspace.opponentName, week: workspace.week, reportName: script.name })) }}>{pending ? 'Exporting…' : 'Export PDF'}</Button>
      {!available && <p>PDF export requires the desktop app</p>}
    </div>
    <article data-report-ready className="report-sheet mx-auto my-6 w-[8.5in] shrink-0 space-y-6 p-[0.5in] shadow print:m-0 print:w-auto print:p-0 print:shadow-none">
      <header className="report-avoid-break space-y-1 border-b border-border pb-4"><h1 className="text-2xl font-bold">{script.name}</h1><p className="text-sm">{workspace.opponentName} · Week {workspace.week} · {workspace.seasonName}</p></header>
      {script.periods.map((period) => <section key={period.id} className="space-y-2">
        <h2 className="report-heading text-lg font-semibold">{period.name}</h2>
        <table className="w-full text-sm">
          <thead><tr><th className="text-left">Rep</th><th className="text-left">Card</th><th className="text-left">Play</th><th className="text-left">Down &amp; Distance</th><th className="text-left">Hash</th><th className="text-left">Note</th></tr></thead>
          <tbody>{period.reps.filter((rep) => live.has(rep.diagramId)).map((rep, index) => <tr key={rep.id}>
            <td>{index + 1}</td><td>{numbers.get(rep.diagramId)}</td><td>{live.get(rep.diagramId)?.title}</td>
            <td>{formatDownDistance(rep.down, rep.distance)}</td><td>{rep.hash ?? ''}</td><td>{rep.note ?? ''}</td>
          </tr>)}</tbody>
        </table>
      </section>)}
    </article>
  </>
}
