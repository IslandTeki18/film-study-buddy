import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import type { FunctionArgs } from 'convex/server'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { CORE_FIELDS } from '@convex/domain/coreFields'
import { columnCatalog, coreColumnKey, fieldColumnKey } from '@convex/domain/templateFields'
import { DEFAULT_SELECTED_PLAY_CORE_KEYS, TABLE_TITLE_MAX_LENGTH, SELECTED_PLAYS_MAX_SNAPS, SELECTED_PLAYS_MAX_COLUMNS, QUICK_NOTES_BLOCK_MAX_NOTES } from '@convex/domain/reportBlocks'
import { formatAvgYards, formatFrequency } from '@convex/domain/aggregate'
import { DiagramSvg } from '@/components/diagram-svg'
import { TendencySnapshot } from '@/components/tendency-snapshot'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

type Source = FunctionArgs<typeof api.reports.insertBlock>['source']
interface PickerProps {
  readonly workspaceId: string
  readonly reportId: Id<'reports'>
  readonly onClose: () => void
  readonly onInserted: (id: string) => void
}

function Picker({ title, source, children, reportId, onClose, onInserted }: PickerProps & {
  readonly title: string
  readonly source: Source | null
  readonly children: ReactNode
}): ReactNode {
  const insert = useMutation(api.reports.insertBlock)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose() }} aria-label={`Add ${title}`} className="max-h-[85vh] w-[min(90vw,720px)] max-w-none overflow-y-auto">
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault()
      if (!source || pending) return
      setPending(true); setError('')
      void insert({ reportId, source }).then((id) => { onInserted(id); onClose() }).catch((error: unknown) => setError(error instanceof Error ? error.message : String(error))).finally(() => setPending(false))
    }}>
      <h2 className="text-lg font-semibold">Add {title}</h2>
      <fieldset disabled={pending} className="space-y-4">{children}</fieldset>
      {error && <p role="alert">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending || !source}>Insert</Button></div>
    </form>
  </Dialog>
}
function Loading(): ReactNode { return <p role="status">Loading…</p> }
function Empty({ to, children }: { readonly to: string; readonly children: ReactNode }): ReactNode {
  return <p>{children} <Link className="underline" to={to}>Open source</Link></p>
}

export function DataTableDialog(props: PickerProps): ReactNode {
  const fields = useQuery(api.opponentData.listGroupingFields, { workspaceId: props.workspaceId })
  const [first, setFirst] = useState('core:formation')
  const [second, setSecond] = useState('')
  const groupBy = fields?.some((field) => field.key === first) ? first : fields?.[0]?.key ?? ''
  const groupBy2 = fields?.some((field) => field.key === second) && second !== groupBy ? second : ''
  const result = useQuery(api.opponentData.aggregate, groupBy ? { workspaceId: props.workspaceId, groupBy, ...(groupBy2 ? { groupBy2 } : {}) } : 'skip')
  const [title, setTitle] = useState<string | null>(null)
  const displayTitle = title ?? [groupBy, groupBy2].flatMap((key) => fields?.find((field) => field.key === key)?.label ?? []).join(' + ').slice(0, TABLE_TITLE_MAX_LENGTH)
  return <Picker {...props} title="Opponent Data Table" source={result?.totalSnaps ? { type: 'dataTable', groupBy, ...(groupBy2 ? { groupBy2 } : {}), title: displayTitle } : null}>
    {fields === undefined ? <Loading /> : <>
      <label className="block">Group By<Select value={groupBy} onChange={(event) => { setFirst(event.target.value); setTitle(null) }}>{fields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}</Select></label>
      <label className="block">Second Group By<Select value={groupBy2} onChange={(event) => { setSecond(event.target.value); setTitle(null) }}><option value="">None</option>{fields.filter((field) => field.key !== groupBy).map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}</Select></label>
      <label className="block">Title<Input value={displayTitle} maxLength={TABLE_TITLE_MAX_LENGTH} onChange={(event) => setTitle(event.target.value)} /></label>
      {groupBy && result === undefined ? <Loading /> : !result?.totalSnaps ? <Empty to={`/w/${props.workspaceId}/data`}>No Snaps in the included Source Games.</Empty> : <table className="w-full text-sm"><thead><tr>{[...result.groupLabels, 'Snaps', 'Frequency', 'Avg. Yards'].map((label, index) => <th key={index} scope="col" className="text-left">{label}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index}>{[...row.values, row.snaps, formatFrequency(row.frequency), formatAvgYards(row.avgYards)].map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody></table>}
    </>}
  </Picker>
}

export function TendencyDialog(props: PickerProps): ReactNode {
  const tendencies = useQuery(api.tendencies.listByWorkspace, { workspaceId: props.workspaceId })
  const [selected, setSelected] = useState<Id<'tendencies'> | null>(null)
  const items = tendencies?.filter((tendency) => tendency.includeInReport)
  return <Picker {...props} title="Tendency / Alert" source={items?.some((item) => item._id === selected) && selected ? { type: 'tendency', tendencyId: selected } : null}>
    {items === undefined ? <Loading /> : !items.length ? <Empty to={`/w/${props.workspaceId}/tendencies`}>No Tendencies / Alerts marked Include in reports.</Empty> : items.map((item) => <label key={item._id} className="block space-y-2 rounded border border-border p-3"><span><input type="radio" name="tendency" checked={selected === item._id} onChange={() => setSelected(item._id)} /> {item.title} · {item.category}</span><TendencySnapshot snapshot={item.snapshot} /></label>)}
  </Picker>
}

export function DiagramDialog(props: PickerProps): ReactNode {
  const diagrams = useQuery(api.diagrams.listByWorkspace, { workspaceId: props.workspaceId })
  const [selected, setSelected] = useState<Id<'diagrams'> | null>(null)
  return <Picker {...props} title="Play Diagram" source={diagrams?.some((item) => item._id === selected) && selected ? { type: 'diagram', diagramId: selected } : null}>
    {diagrams === undefined ? <Loading /> : !diagrams.length ? <Empty to={`/w/${props.workspaceId}/games`}>No Play Diagrams yet.</Empty> : diagrams.map((diagram) => <label key={diagram._id} className="block rounded border border-border p-3"><span><input type="radio" name="diagram" checked={selected === diagram._id} onChange={() => setSelected(diagram._id)} /> {diagram.name ?? 'Play Diagram'} · {diagram.sourceGameLabel}</span><DiagramSvg diagram={diagram} {...(diagram.hiddenSide ? { hideSide: diagram.hiddenSide } : {})} className="max-w-xs" /></label>)}
  </Picker>
}

export function SelectedPlaysDialog(props: PickerProps): ReactNode {
  const games = useQuery(api.sourceGames.listByWorkspace, { workspaceId: props.workspaceId })
  const [gameId, setGameId] = useState('')
  const game = games?.find((game) => game._id === gameId) ?? games?.[0]
  const snaps = useQuery(api.snaps.listBySourceGame, game ? { sourceGameId: game._id } : 'skip')
  const template = useQuery(api.templates.getFull, game ? { templateId: game.templateId } : 'skip')
  const [selected, setSelected] = useState<Id<'snaps'>[]>([])
  const [columns, setColumns] = useState<string[]>(DEFAULT_SELECTED_PLAY_CORE_KEYS.map(coreColumnKey))
  const fields = template?.sections.flatMap((section) => section.fields) ?? []
  const catalog = columnCatalog(fields.map((field) => field._id))
  const validColumns = columns.filter((key) => catalog.includes(key as typeof catalog[number]))
  const chosen = selected.filter((id) => snaps?.some((snap) => snap._id === id))
  return <Picker {...props} title="Selected Plays" source={game && snaps && template !== undefined && chosen.length > 0 && chosen.length <= SELECTED_PLAYS_MAX_SNAPS && validColumns.length > 0 && validColumns.length <= SELECTED_PLAYS_MAX_COLUMNS ? { type: 'selectedPlays', sourceGameId: game._id, snapIds: chosen, columnKeys: validColumns } : null}>
    {games === undefined ? <Loading /> : !games.length ? <Empty to={`/w/${props.workspaceId}/games`}>No Source Games yet.</Empty> : <>
      <label className="block">Source Game<Select value={game?._id ?? ''} onChange={(event) => { setGameId(event.target.value); setSelected([]); setColumns(DEFAULT_SELECTED_PLAY_CORE_KEYS.map(coreColumnKey)) }}>{games.map((game) => <option key={game._id} value={game._id}>{game.label}</option>)}</Select></label>
      {snaps === undefined || template === undefined ? <Loading /> : <>
        <fieldset className="space-y-2"><legend>Columns ({validColumns.length} / {SELECTED_PLAYS_MAX_COLUMNS})</legend><div className="grid grid-cols-2 gap-2">{catalog.map((key) => <Checkbox key={key} label={CORE_FIELDS.find((field) => coreColumnKey(field.key) === key)?.label ?? fields.find((field) => fieldColumnKey(field._id) === key)!.name} checked={validColumns.includes(key)} disabled={!validColumns.includes(key) && validColumns.length >= SELECTED_PLAYS_MAX_COLUMNS} onChange={(event) => setColumns(event.target.checked ? [...validColumns, key] : validColumns.filter((value) => value !== key))} />)}</div></fieldset>
        {!snaps.length ? <Empty to={`/w/${props.workspaceId}/games/${game?._id}`}>No Snaps yet.</Empty> : <fieldset className="space-y-2"><legend>Snaps ({chosen.length} / {SELECTED_PLAYS_MAX_SNAPS})</legend><Button type="button" variant="outline" onClick={() => setSelected(snaps.slice(0, SELECTED_PLAYS_MAX_SNAPS).map((snap) => snap._id))}>Select all</Button> <Button type="button" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
          {snaps.map((snap) => <Checkbox key={snap._id} label={`${snap.order}. Clip ${snap.core.clipNumber ?? '—'} · ${snap.core.down ?? '—'} & ${snap.core.distance ?? '—'} · ${snap.core.formation ?? '—'}`} checked={chosen.includes(snap._id)} disabled={!chosen.includes(snap._id) && chosen.length >= SELECTED_PLAYS_MAX_SNAPS} onChange={(event) => setSelected(event.target.checked ? [...chosen, snap._id] : chosen.filter((id) => id !== snap._id))} />)}
        </fieldset>}
      </>}
    </>}
  </Picker>
}

export function QuickNotesDialog(props: PickerProps): ReactNode {
  const games = useQuery(api.sourceGames.listByWorkspace, { workspaceId: props.workspaceId })
  const [gameId, setGameId] = useState('')
  const game = games?.find((game) => game._id === gameId) ?? games?.[0]
  const notes = useQuery(api.notes.listQuickNotes, game ? { sourceGameId: game._id } : 'skip')
  const [selected, setSelected] = useState<Id<'quickNotes'>[]>([])
  const chosen = selected.filter((id) => notes?.some((note) => note._id === id))
  return <Picker {...props} title="Quick Notes" source={chosen.length > 0 && chosen.length <= QUICK_NOTES_BLOCK_MAX_NOTES ? { type: 'quickNotes', noteIds: chosen } : null}>
    {games === undefined ? <Loading /> : !games.length ? <Empty to={`/w/${props.workspaceId}/games`}>No Source Games yet.</Empty> : <>
      <label className="block">Source Game<Select value={game?._id ?? ''} onChange={(event) => { setGameId(event.target.value); setSelected([]) }}>{games.map((game) => <option key={game._id} value={game._id}>{game.label}</option>)}</Select></label>
      <p>{chosen.length} / {QUICK_NOTES_BLOCK_MAX_NOTES} Quick Notes</p>
      {notes === undefined ? <Loading /> : !notes.length ? <Empty to={`/w/${props.workspaceId}/games/${game?._id}/notes`}>No Quick Notes yet.</Empty> : notes.map((note) => <Checkbox key={note._id} label={`${note.text}${note.tags.length ? ' · ' + note.tags.join(', ') : ''}`} checked={chosen.includes(note._id)} disabled={!chosen.includes(note._id) && chosen.length >= QUICK_NOTES_BLOCK_MAX_NOTES} onChange={(event) => setSelected(event.target.checked ? [...chosen, note._id] : chosen.filter((id) => id !== note._id))} />)}
    </>}
  </Picker>
}
