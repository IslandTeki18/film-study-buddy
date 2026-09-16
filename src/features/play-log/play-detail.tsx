import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '@convex/_generated/api'
import type { Doc } from '@convex/_generated/dataModel'
import type { TerminologyList } from '@convex/domain/terminology'
import { isCoreFieldKey, normalizeCoreValue } from '@convex/domain/coreFields'
import { provenanceOf, restoredValueFor } from '@convex/domain/provenance'
import { sectionAppliesTo } from '@convex/domain/playSide'
import { Button } from '@/components/ui/button'
import { DiagramSvg } from '@/components/diagram-svg'
import { Chip, Eyebrow, Meta, Panel } from '@/components/ui/panel'
import { QuickNoteDialog } from '@/features/notes/quick-note-dialog'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { inDialog, isShortcut, SHORTCUTS } from '@/lib/shortcuts'
import { useSetMustReview } from './use-set-must-review'
import { buildColumns } from './columns'
import { Cell } from './cell'
import { displayValue } from './row-model'
import { CellNoteEditor, FieldEditor, useSaveCellNote, useUpdateSnapField } from './cell-editors'

export function PlayDetail({ workspaceId, sourceGameId, snapId, embedded = false }: {
  readonly workspaceId: string; readonly sourceGameId: string; readonly snapId: string; readonly embedded?: boolean
}): ReactNode {
  const Root = embedded ? 'div' : 'main'
  const game = useQuery(api.sourceGames.get, { sourceGameId })
  const snap = useQuery(api.snaps.get, { snapId })
  const tree = useQuery(api.templates.getFull, game ? { templateId: game.templateId } : 'skip')
  const notes = useQuery(api.notes.listCellNotes, snap ? { snapId: snap._id } : 'skip')
  const terminology = useQuery(api.terminology.list, {})
  const base = `/w/${workspaceId}/games/${sourceGameId}`
  if (game === undefined || snap === undefined || terminology === undefined || (game && tree === undefined) || (snap && notes === undefined)) {
    return <Root role="status" aria-label="Loading Play Detail" className="m-6 h-32 animate-pulse rounded bg-muted" />
  }
  if (!game || !snap || game.workspaceId !== workspaceId || snap.sourceGameId !== game._id || !tree) {
    return <Root className="space-y-3 p-6"><h1>Snap not found</h1><Link className="underline" to={base}>Back to Play Log</Link></Root>
  }
  return <DetailContent embedded={embedded} key={snap._id} snap={snap} tree={tree} notes={notes ?? []} terminology={terminology} base={base} />
}

function DetailContent({ snap, tree, notes, terminology, base, embedded }: {
  readonly embedded: boolean
  readonly snap: Doc<'snaps'>; readonly tree: NonNullable<FunctionReturnType<typeof api.templates.getFull>>
  readonly notes: readonly Doc<'cellNotes'>[]; readonly terminology: readonly { list: TerminologyList; value: string }[]; readonly base: string
}): ReactNode {
  const quickNotes = useQuery(api.notes.listQuickNotes, { sourceGameId: snap.sourceGameId })
  const diagram = useQuery(api.diagrams.getBySnap, { snapId: snap._id })
  const snapQuickNotes = quickNotes?.filter((note) => note.snapId === snap._id)
  const [noting, setNoting] = useState(false)
  const Root = embedded ? 'div' : 'main'
  const markingRef = useRef(false)
  const columns = buildColumns(tree)
  const sections = tree.sections.filter((section) => sectionAppliesTo(section.name, snap.core.playType))
  const [editing, setEditing] = useState<ReadonlySet<string>>(new Set())
  function toggleEditing(key: string): void { setEditing((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next }) }
  const saveNote = useSaveCellNote(snap.sourceGameId)
  const update = useUpdateSnapField(snap)
  const [adding, setAdding] = useState('')
  const [restoring, setRestoring] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)
  const { show } = useToast()
  const mark = useSetMustReview(snap.sourceGameId)
  const restore = useMutation(api.snaps.restoreImportedValue).withOptimisticUpdate((store, args) => {
    if (!isCoreFieldKey(args.key)) return
    const key = args.key
    const original = restoredValueFor(snap.imported, key)
    if (original === null) return
    let value: ReturnType<typeof normalizeCoreValue>
    try { value = normalizeCoreValue(key, original) } catch { return }
    function update(item: Doc<'snaps'>): Doc<'snaps'> {
      if (item._id !== args.snapId) return item
      const core = { ...item.core }
      if (value === undefined) delete core[key]
      else Object.assign(core, { [key]: value })
      return { ...item, core }
    }
    const detail = store.getQuery(api.snaps.get, { snapId: args.snapId })
    if (detail) store.setQuery(api.snaps.get, { snapId: args.snapId }, update(detail))
    const query = { sourceGameId: snap.sourceGameId }
    const current = store.getQuery(api.snaps.listBySourceGame, query)
    if (current) store.setQuery(api.snaps.listBySourceGame, query, current.map(update))
  })
  function toggleMustReview(): void {
    if (markingRef.current) return
    markingRef.current = true
    setMarking(true)
    void mark({ snapId: snap._id, mustReview: !snap.mustReview })
      .catch((error: unknown) => show({ message: `Could not update Must Review. ${error instanceof Error ? error.message : String(error)}` }))
      .finally(() => { markingRef.current = false; setMarking(false) })
  }
  useEffect(() => {
    if (embedded) return
    function onKey(event: KeyboardEvent): void {
      if (event.defaultPrevented || inDialog(event.target) || !isShortcut(event, 'toggleMustReview')) return
      event.preventDefault()
      toggleMustReview()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })
  return <Root className={embedded ? 'grid gap-6 p-6' : 'mx-auto grid w-full max-w-6xl gap-6 px-6 pt-8 pb-12'}>
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><Eyebrow>Play Detail</Eyebrow><div className="flex items-center gap-3"><h1 className="text-lg font-semibold">Snap {snap.core.clipNumber ?? snap.order}</h1>{snap.mustReview && <Chip>Must Review</Chip>}</div></div>
      {!embedded && <div className="flex flex-wrap items-center gap-3"><Link className="underline" to={base}>Back to Play Log</Link>
      <Button variant="outline" title={SHORTCUTS.toggleMustReview.label} disabled={marking} onClick={toggleMustReview}>{snap.mustReview ? 'Resolve Must Review' : 'Mark Must Review'}</Button></div>}
    </header>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
    <div className="grid min-w-0 content-start gap-6">
    <SectionPanel title="Core Snap Data" editing={editing.has('core')} onToggle={() => toggleEditing('core')}>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
        {columns.filter((column) => column.kind === 'core').map((column) => {
          const edited = provenanceOf(snap.imported, column.field.key, snap.core[column.field.key]) === 'Coach Edited'
          return <div key={column.key}><dt className="text-sm text-muted-foreground">{column.label}</dt>
            <dd><div hidden={editing.has('core')}>{displayValue(snap, column) === '' ? <Meta>—</Meta> : <Cell snap={snap} column={column} />}</div>
              <div hidden={!editing.has('core')} className="space-y-1">
              <FieldEditor column={column} value={snap.core[column.field.key]} terminology={terminology} onSave={(value) => update(column, value)} />
              {edited && <div className="space-y-1 text-sm">
                <p>Original Hudl value: {snap.imported?.[column.field.key]}</p>
                <Button variant="outline" size="sm" disabled={restoring !== null} aria-label={`Restore original ${column.label}`}
                  onClick={() => {
                    setRestoring(column.key)
                    void restore({ snapId: snap._id, key: column.field.key })
                      .catch((error: unknown) => show({ message: `Could not restore ${column.label}. ${error instanceof Error ? error.message : String(error)}` }))
                      .finally(() => setRestoring(null))
                  }}>Restore original</Button>
              </div>}
              </div>
            </dd>
          </div>
        })}
      </dl>
    </SectionPanel>
    <section className="grid gap-4" aria-label="Template Analysis Data">
      <h2 className="sr-only">Template Analysis Data</h2>
      {sections.length === 0 && <Meta>No Sections apply to this Play Type</Meta>}
      {sections.map((section) => {
        const fields = columns.filter((column) => column.kind === 'template' && column.field.sectionId === section._id)
        return <SectionPanel key={section._id} title={section.name} editing={editing.has(section._id)} {...(fields.length ? { onToggle: () => toggleEditing(section._id) } : {})}>
          {fields.length === 0 ? <Meta>No fields in this Section</Meta> : <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">{fields.map((column) =>
            <div key={column.key}><dt className="text-sm text-muted-foreground">{column.label}</dt><dd>
              <div hidden={editing.has(section._id)}>{displayValue(snap, column) === '' ? <Meta>—</Meta> : <Cell snap={snap} column={column} />}</div>
              <div hidden={!editing.has(section._id)}><FieldEditor column={column} value={column.kind === 'template' ? snap.analysis[column.field._id] : undefined} terminology={terminology} onSave={(value) => update(column, value)} /></div>
            </dd></div>)}</dl>}
        </SectionPanel>
      })}
    </section>
    <SectionPanel title="Cell Notes" editing={editing.has('cellNotes')} onToggle={() => toggleEditing('cellNotes')}>
      <div hidden={editing.has('cellNotes')}>
        {notes.length === 0 ? <Meta>No Cell Notes</Meta> : <dl className="space-y-3">{notes.map((note) => <div key={note._id}>
          <dt className="text-sm text-muted-foreground">{columns.find((column) => column.key === note.fieldKey)?.label ?? note.fieldKey}</dt>
          <dd><p className="whitespace-pre-wrap">{note.text}</p></dd>
        </div>)}</dl>}
      </div>
      <div hidden={!editing.has('cellNotes')} className="space-y-3">
      {columns.filter((column) => column.key === adding || notes.some((note) => note.fieldKey === column.key)).map((column) =>
        <div key={column.key} className="max-w-xl space-y-1"><h3 className="text-sm">{column.label}</h3>
          <CellNoteEditor label={column.label} note={notes.find((note) => note.fieldKey === column.key)?.text ?? ''}
            onSave={(text) => saveNote({ snapId: snap._id, fieldKey: column.key, text })}
            onRemove={() => { if (adding === column.key) setAdding('') }} />
        </div>)}
      <Select className="max-w-xs" aria-label="Add note to field" value={adding} onChange={(event) => setAdding(event.target.value)}>
        <option value="">Add note to field…</option>
        {columns.filter((column) => column.key === adding || !notes.some((note) => note.fieldKey === column.key))
          .map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
      </Select>
      </div>
    </SectionPanel>
    </div>
    <div className="grid min-w-0 content-start gap-6">
    <SectionPanel title="Quick Notes">
      {snapQuickNotes === undefined ? <Meta>Loading…</Meta> : snapQuickNotes.length === 0 ? <Meta>No Quick Notes for this Snap</Meta> : <ul className="space-y-3">{snapQuickNotes.map((note) => <li key={note._id} className="space-y-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
        <Meta>{new Date(note.createdAt).toLocaleString()}</Meta><p className="whitespace-pre-wrap">{note.text}</p>
        <div className="flex flex-wrap gap-2">{note.tags.map((tag) => <Chip key={tag}>{tag}</Chip>)}</div>
      </li>)}</ul>}
      <div className="flex items-center gap-3"><Button variant="outline" onClick={() => setNoting(true)}>Add Quick Note</Button><Link className="underline" to={`${base}/notes`}>All Quick Notes</Link></div>
      <QuickNoteDialog open={noting} onOpenChange={setNoting} sourceGameId={snap.sourceGameId} snap={snap} />
    </SectionPanel>
    <SectionPanel title="Play Diagram">
      {diagram === undefined ? <Meta>Loading…</Meta> : diagram ? <div className="space-y-2">
        <Link className="block" to={`${base}/diagrams/${diagram._id}`} aria-label="Edit Play Diagram">
          <DiagramSvg diagram={diagram} title="Play Diagram" className="rounded-xl border border-border" {...(diagram.hiddenSide ? { hideSide: diagram.hiddenSide } : {})} />
        </Link>
        <Link className="underline" to={`${base}/diagrams/${diagram._id}`}>Edit Play Diagram</Link>
        {diagram.note && <p className="whitespace-pre-wrap">{diagram.note}</p>}
      </div> : <div className="flex flex-wrap gap-3">
        <Link className="underline" to={`${base}/diagrams?snap=${snap._id}&new=1`}>Add Play Diagram</Link>
        <Link className="underline" to={`${base}/diagrams?snap=${snap._id}`}>Use existing Play Diagram</Link>
      </div>}
    </SectionPanel>
    </div>
    </div>
  </Root>
}

function SectionPanel({ title, editing, onToggle, children }: {
  readonly title: string; readonly editing?: boolean; readonly onToggle?: () => void; readonly children: ReactNode
}): ReactNode {
  return <section aria-label={title}>
    <Panel className="grid gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2><Eyebrow>{title}</Eyebrow></h2>
        {onToggle && <Button variant="outline" size="sm" aria-pressed={editing} aria-label={`${editing ? 'Finish editing' : 'Edit'} ${title}`} onClick={onToggle}>{editing ? 'Done' : 'Edit'}</Button>}
      </div>
      {children}
    </Panel>
  </section>
}
