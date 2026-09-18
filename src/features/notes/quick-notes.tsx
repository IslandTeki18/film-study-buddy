import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc } from '@convex/_generated/dataModel'
import { QUICK_NOTE_TEXT_MAX_LENGTH, tagVocabulary } from '@convex/domain/quickNoteTags'
import { Button } from '@/components/ui/button'
import { Chip, Meta, Page } from '@/components/ui/panel'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useUndoableMutation } from '@/lib/db/use-undoable-mutation'
import { QuickNoteDialog } from './quick-note-dialog'
import { TagPicker } from './tag-picker'

export function QuickNotes({ workspaceId, sourceGameId }: { readonly workspaceId: string; readonly sourceGameId: string }): ReactNode {
  const game = useQuery(api.sourceGames.get, { sourceGameId })
  const notes = useQuery(api.notes.listQuickNotes, game ? { sourceGameId: game._id } : 'skip')
  const snaps = useQuery(api.snaps.listBySourceGame, game ? { sourceGameId: game._id } : 'skip')
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<string | null>(null)
  const base = `/w/${workspaceId}/games/${sourceGameId}`
  if (game === undefined || (game && (notes === undefined || snaps === undefined))) return <div role="status" aria-label="Loading Quick Notes" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!game || game.workspaceId !== workspaceId) return <Page><h1>Source Game not found</h1><Link to={`/w/${workspaceId}/games`} className="underline">Back to Source Games</Link></Page>
  const vocabulary = tagVocabulary((notes ?? []).flatMap((note) => note.tags))
  const used = new Set((notes ?? []).flatMap((note) => note.tags.map((tag) => tag.toLowerCase())))
  const labels = new Map((snaps ?? []).map((snap) => [snap._id, snap.core.clipNumber ?? snap.order]))
  const visible = (notes ?? []).filter((note) => filter === null || note.tags.some((tag) => tag.toLowerCase() === filter.toLowerCase()))
  return <Page>
    <header className="flex flex-wrap items-center gap-3"><h1 className="text-lg font-semibold">Quick Notes</h1><Meta>{notes?.length ?? 0} Quick Notes</Meta><Button onClick={() => setCreating(true)}>New Quick Note</Button></header>
    <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-2">
      {[null, ...vocabulary.filter((tag) => used.has(tag.toLowerCase()))].map((tag) => <Button key={tag === null ? 'all' : `tag:${tag}`} variant={filter === tag ? 'default' : 'outline'} size="sm" aria-pressed={filter === tag} onClick={() => setFilter(tag)}>{tag ?? 'All'}</Button>)}
    </div>
    {visible.length === 0 ? <p>{filter ? `No Quick Notes tagged ${filter}` : 'No Quick Notes yet'}</p> : <ol className="space-y-4">{visible.map((note) => <li key={note._id} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3"><Meta>{new Date(note.createdAt).toLocaleString()}</Meta>{note.snapId && (labels.has(note.snapId) ? <Link className="text-sm underline" to={`${base}/snap/${note.snapId}`}>Snap {labels.get(note.snapId)}</Link> : <Meta>Snap removed</Meta>)}</div>
      <QuickNoteItem note={note} vocabulary={vocabulary} />
    </li>)}</ol>}
    <QuickNoteDialog open={creating} onOpenChange={setCreating} sourceGameId={game._id} />
  </Page>
}

function QuickNoteItem({ note, vocabulary }: { readonly note: Doc<'quickNotes'>; readonly vocabulary: readonly string[] }): ReactNode {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note.text)
  const [tags, setTags] = useState(note.tags)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const id = useId()
  const { show } = useToast()
  const update = useMutation(api.notes.updateQuickNote)
  const remove = useMutation(api.notes.removeQuickNote).withOptimisticUpdate((store, args) => {
    const query = { sourceGameId: note.sourceGameId }
    const current = store.getQuery(api.notes.listQuickNotes, query)
    if (current) store.setQuery(api.notes.listQuickNotes, query, current.filter((item) => item._id !== args.quickNoteId))
  })
  const undo = useMutation(api.deletions.undo)
  const deleteNote = useUndoableMutation(() => remove({ quickNoteId: note._id }), async (args) => { await undo(args) }, () => 'Deleted Quick Note')
  function fail(error: unknown): void {
    const message = `Could not update Quick Note. ${error instanceof Error ? error.message : String(error)}`
    setError(message); show({ message })
  }
  return <div className="space-y-3">
    {editing ? <fieldset disabled={pending} className="space-y-3" onKeyDown={(event) => {
      if (event.key === 'Escape' && !pending) { event.preventDefault(); setEditing(false); setError('') }
    }}>
      <Textarea aria-label="Quick Note text" autoFocus maxLength={QUICK_NOTE_TEXT_MAX_LENGTH} value={text} onChange={(event) => setText(event.target.value)} />
      <TagPicker vocabulary={vocabulary} selected={tags} onChange={setTags} idPrefix={id} />
      <div className="flex gap-2"><Button disabled={pending || !text.trim()} onClick={() => {
        if (pending || !text.trim()) return
        setPending(true); setError('')
        void update({ quickNoteId: note._id, text, tags }).then(() => setEditing(false)).catch(fail).finally(() => setPending(false))
      }}>Save</Button><Button variant="outline" onClick={() => { setEditing(false); setError('') }}>Cancel</Button></div>
    </fieldset> : <>
      <p className="whitespace-pre-wrap">{note.text}</p>
      <div className="flex flex-wrap gap-2">{note.tags.map((tag) => <Chip key={tag}>{tag}</Chip>)}</div>
      <div className="flex gap-2"><Button variant="outline" size="sm" disabled={pending} onClick={() => { setText(note.text); setTags(note.tags); setError(''); setEditing(true) }}>Edit</Button>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => {
          if (pending) return
          setPending(true); setError('')
          void deleteNote(undefined).catch(fail).finally(() => setPending(false))
        }}>Delete</Button></div>
    </>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>
}
