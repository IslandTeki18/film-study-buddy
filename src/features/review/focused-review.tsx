import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Meta } from '@/components/ui/panel'
import { useToast } from '@/components/ui/toast'
import { PendingFieldEdits } from '@/features/play-log/cell-editors'
import { PlayDetail } from '@/features/play-log/play-detail'
import { useSetMustReview } from '@/features/play-log/use-set-must-review'
import { inDialog, isShortcut, SHORTCUTS } from '@/lib/shortcuts'

export function FocusedReview({ workspaceId, sourceGameId, snapId }: {
  readonly workspaceId: string; readonly sourceGameId: string; readonly snapId: string
}): ReactNode {
  const game = useQuery(api.sourceGames.get, { sourceGameId })
  if (game === undefined) return <main className="p-6">Loading…</main>
  if (!game || game.workspaceId !== workspaceId) return <main className="p-6">Source Game not found</main>
  return <ReviewContent key={game._id} workspaceId={workspaceId} sourceGameId={game._id} snapId={snapId} />
}

function ReviewContent({ workspaceId, sourceGameId, snapId }: {
  readonly workspaceId: string; readonly sourceGameId: Id<'sourceGames'>; readonly snapId: string
}): ReactNode {
  const snaps = useQuery(api.snaps.listBySourceGame, { sourceGameId })
  const navigate = useNavigate()
  const { show } = useToast()
  const mark = useSetMustReview(sourceGameId)
  // ponytail: skip order lasts for this visit; persist it if coaches need cross-session skips.
  const [deferred, setDeferred] = useState<Id<'snaps'>[]>([])
  const [resolving, setResolving] = useState<Doc<'snaps'>[] | null>(null)
  const edits = useRef(new Set<() => Promise<void>>())
  const pending = useRef(false)
  const active = useRef(true)
  const currentId = useRef(snapId)
  currentId.current = snapId
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  const walk = resolving ?? reviewWalk(snaps ?? [], deferred)
  const index = walk.findIndex((snap) => snap._id === snapId)
  const current = walk[index]
  const base = `/w/${workspaceId}/games/${sourceGameId}`
  function goTo(target: Doc<'snaps'> | undefined): void {
    if (target) void advance(target)
  }
  function skip(): void {
    if (!current || walk.length < 2) return
    const target = walk[index + 1] ?? walk.find((snap) => snap._id !== current._id)
    void advance(target, false, true)
  }
  function resolve(): Promise<void> {
    return advance(walk[index + 1] ?? walk[index - 1], true)
  }
  async function advance(target: Doc<'snaps'> | undefined, resolve = false, defer = false): Promise<void> {
    if (!current || pending.current) return
    pending.current = true
    setResolving(walk)
    try {
      await Promise.all([...edits.current].map((commit) => commit()))
      if (!active.current || currentId.current !== current._id) return
      if (resolve) await mark({ snapId: current._id, mustReview: false })
      if (active.current && currentId.current === current._id) {
        if (defer) setDeferred([...deferred.filter((id) => id !== current._id), current._id])
        navigate(target ? `${base}/review/${target._id}` : `${base}/review`, { replace: true })
      }
    } catch (error) {
      show({ message: `Could not advance review. ${error instanceof Error ? error.message : String(error)}` })
    } finally { pending.current = false; setResolving(null) }
  }
  useEffect(() => {
    if (snaps !== undefined && !resolving && index === -1 && walk[0]) {
      navigate(`${base}/review/${walk[0]._id}`, { replace: true })
    }
  }, [snaps, resolving, index, walk, base, navigate])
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.defaultPrevented || inDialog(event.target)) return
      if (isShortcut(event, 'toggleMustReview')) { event.preventDefault(); void resolve() }
      else if (isShortcut(event, 'reviewNext')) { event.preventDefault(); goTo(walk[index + 1]) }
      else if (isShortcut(event, 'reviewPrevious')) { event.preventDefault(); goTo(walk[index - 1]) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })
  if (snaps === undefined) return <main className="p-6">Loading…</main>
  if (!current) return <main className="space-y-3 p-6">
    <h1>{walk.length ? 'Loading…' : 'Review Queue is empty'}</h1>
    <Link className="mr-4 underline" to={base}>Back to Play Log</Link>
    <Link className="underline" to={`${base}/review`}>Back to Review Queue</Link>
  </main>
  return <main>
    <header role="toolbar" aria-label="Focused Review" className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-background p-4">
      <Meta>{index + 1} of {walk.length}</Meta>
      <Button variant="outline" title={SHORTCUTS.reviewPrevious.label} disabled={!!resolving || index === 0} onClick={() => goTo(walk[index - 1])}>Previous</Button>
      <Button variant="outline" title={SHORTCUTS.reviewNext.label} disabled={!!resolving || index === walk.length - 1} onClick={() => goTo(walk[index + 1])}>Next</Button>
      <Button variant="outline" disabled={!!resolving || walk.length < 2} onClick={skip}>Skip</Button>
      <Button autoFocus title={SHORTCUTS.toggleMustReview.label} disabled={!!resolving} onClick={() => { void resolve() }}>Resolve</Button>
      <Link className="underline" to={`${base}/review`} onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        void advance(undefined)
      }}>Back to Review Queue</Link>
    </header>
    <PendingFieldEdits value={edits.current}>
      <PlayDetail embedded workspaceId={workspaceId} sourceGameId={sourceGameId} snapId={snapId} />
    </PendingFieldEdits>
  </main>
}

export function reviewWalk(snaps: readonly Doc<'snaps'>[], deferred: readonly Id<'snaps'>[]): Doc<'snaps'>[] {
  const flagged = snaps.filter((snap) => snap.mustReview).sort((a, b) => a.order - b.order)
  return [
    ...flagged.filter((snap) => !deferred.includes(snap._id)),
    ...deferred.map((id) => flagged.find((snap) => snap._id === id)).filter((snap): snap is Doc<'snaps'> => snap !== undefined),
  ]
}
