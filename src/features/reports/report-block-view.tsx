import type { ReactNode } from 'react'
import type { Doc } from '@convex/_generated/dataModel'
import { visibleSelectedPlayFields } from '@convex/domain/reportBlocks'
import { DiagramSvg } from '@/components/diagram-svg'
import { TendencySnapshot } from '@/components/tendency-snapshot'
import { Chip, Meta } from '@/components/ui/panel'

export type ReportBlock = Doc<'reports'>['blocks'][number]

export function ReportBlockView({ block, showClipReferences, mode }: {
  readonly block: ReportBlock
  readonly showClipReferences: boolean
  readonly mode: 'builder' | 'print'
}): ReactNode {
  switch (block.type) {
    case 'heading': return block.text.trim() ? <h2 className="report-heading text-xl font-bold">{block.text}</h2> : mode === 'builder' ? <Meta>Empty Heading</Meta> : null
    case 'text': return block.text.trim() ? <p className="whitespace-pre-wrap">{block.text}</p> : mode === 'builder' ? <Meta>Empty Text / Coach Notes</Meta> : null
    case 'dataTable': return <figure className="space-y-2"><figcaption className="report-heading font-semibold">{block.title}</figcaption><SnapshotTable columns={block.columns} rows={block.rows} numericFrom={block.columns.length - 3} /></figure>
    case 'tendency': return <section className="report-avoid-break space-y-3"><h3 className="font-semibold">{block.title}</h3><Meta>{block.category}</Meta>
      <TendencySnapshot snapshot={block} />
      {block.note && <p className="whitespace-pre-wrap">Coaching Point: {block.note}</p>}
      {block.diagram && <DiagramSvg diagram={block.diagram} {...(block.diagram.hiddenSide ? { hideSide: block.diagram.hiddenSide } : {})} className="max-w-[5.5in]" />}
    </section>
    case 'diagram': return <figure className="report-avoid-break space-y-2">
      {block.caption && <figcaption className="font-semibold">{block.caption}</figcaption>}
      <DiagramSvg diagram={block.diagram} {...(block.diagram.hiddenSide ? { hideSide: block.diagram.hiddenSide } : {})} className="max-w-[5.5in]" />
      {block.diagram.note && <p className="whitespace-pre-wrap">{block.diagram.note}</p>}
    </figure>
    case 'selectedPlays': {
      const columns = visibleSelectedPlayFields(block.fields, showClipReferences)
      return <SnapshotTable columns={columns} rows={block.rows.map((row) => columns.map((column) => row[column] ?? ''))} />
    }
    case 'quickNotes': return <ul className="space-y-3">{block.notes.map((note, index) => <li key={index} className="space-y-1"><p className="whitespace-pre-wrap">{note.text}</p><div className="flex flex-wrap gap-1">{note.tags.map((tag) => <Chip key={tag}>{tag}</Chip>)}</div></li>)}</ul>
  }
}

function SnapshotTable({ columns, rows, numericFrom = Infinity }: {
  readonly columns: readonly string[]
  readonly rows: readonly (readonly string[])[]
  readonly numericFrom?: number
}): ReactNode {
  return <table className="w-full table-fixed border-collapse text-xs">
    <thead><tr>{columns.map((column, index) => <th key={index} scope="col" className={`border-b border-border px-2 py-2 break-words ${index >= numericFrom ? 'text-right font-mono' : 'text-left'}`}>{column}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index}>{columns.map((_, column) => <td key={column} className={`border-b border-border px-2 py-2 break-words ${column >= numericFrom ? 'text-right font-mono' : ''}`}>{row[column] || '—'}</td>)}</tr>)}</tbody>
  </table>
}
