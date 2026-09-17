import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import schema, { gradeValidator, positionGroupValidator } from './schema'
import { softDeleteBatch } from './deletions'
import { requireLiveSnap } from './snaps'
import { requireLiveWorkspace } from './workspaces'
import {
  POSITION_GROUPS, PLAYER_DETAILS_MAX_LENGTH, PLAYER_NAME_MAX_LENGTH, PLAYER_NOTE_SNAPS_MAX,
  PLAYER_NOTE_TEXT_MAX_LENGTH, PLAYER_PROFILE_TEXT_MAX_LENGTH, compareJersey,
  normalizeJersey, normalizePosition, normalizeTraits,
} from './domain/opponentPlayers.ts'

const linkedSnapValidator = v.object({
  snapId: v.id('snaps'), sourceGameId: v.id('sourceGames'), sourceGameLabel: v.string(),
  clipNumber: v.optional(v.string()), order: v.number(),
})
const noteValidator = v.object({
  ...schema.tables.playerNotes.validator.fields, _id: v.id('playerNotes'), _creationTime: v.number(),
  snaps: v.array(linkedSnapValidator),
})
const playerWithNotesValidator = v.object({
  ...schema.tables.opponentPlayers.validator.fields, _id: v.id('opponentPlayers'), _creationTime: v.number(),
  notes: v.array(noteValidator), clipCount: v.number(),
})

async function requireLivePlayer(ctx: QueryCtx | MutationCtx, playerId: Id<'opponentPlayers'>): Promise<Doc<'opponentPlayers'>> {
  const player = await ctx.db.get(playerId)
  if (!player || player.deletedAt !== undefined) throw new Error('Opponent Player not found')
  await requireLiveWorkspace(ctx, player.workspaceId)
  return player
}

async function requireLiveNote(ctx: MutationCtx, noteId: Id<'playerNotes'>): Promise<Doc<'playerNotes'>> {
  const note = await ctx.db.get(noteId)
  if (!note || note.deletedAt !== undefined) throw new Error('Player Note not found')
  await requireLivePlayer(ctx, note.playerId)
  return note
}

function profileText(value: string, label: string, max: number): string {
  if (value.length > max) throw new Error(`${label} must be at most ${max} characters`)
  return value
}

async function noteFields(ctx: MutationCtx, player: Doc<'opponentPlayers'>, text: string, snapIds: Id<'snaps'>[]) {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('A Player Note needs text')
  if (trimmed.length > PLAYER_NOTE_TEXT_MAX_LENGTH) throw new Error(`A Player Note is at most ${PLAYER_NOTE_TEXT_MAX_LENGTH} characters`)
  const ids = [...new Set(snapIds)]
  if (ids.length > PLAYER_NOTE_SNAPS_MAX) throw new Error(`Link at most ${PLAYER_NOTE_SNAPS_MAX} Snaps per Player Note`)
  for (const id of ids) {
    const snap = await requireLiveSnap(ctx, id)
    const game = await ctx.db.get(snap.sourceGameId)
    if (game?.workspaceId !== player.workspaceId) throw new Error('Snap belongs to a different Weekly Opponent Workspace')
  }
  return { text: trimmed, snapIds: ids }
}

export const listByWorkspace = query({
  args: { workspaceId: v.id('workspaces') }, returns: v.array(playerWithNotesValidator),
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId)
    if (!workspace || workspace.deletedAt !== undefined) return []
    const season = await ctx.db.get(workspace.seasonId)
    if (!season || season.deletedAt !== undefined) return []
    const players = (await ctx.db.query('opponentPlayers').withIndex('by_workspace', (q) => q.eq('workspaceId', workspace._id)).collect())
      .filter((player) => player.deletedAt === undefined)
      .sort((a, b) => POSITION_GROUPS.findIndex((group) => group.key === a.group) - POSITION_GROUPS.findIndex((group) => group.key === b.group)
        || compareJersey(a.jersey, b.jersey) || a.name.localeCompare(b.name))
    return Promise.all(players.map(async (player) => {
      const entries = (await ctx.db.query('playerNotes').withIndex('by_player', (q) => q.eq('playerId', player._id)).collect())
        .filter((note) => note.deletedAt === undefined).sort((a, b) => b.createdAt - a.createdAt || b._creationTime - a._creationTime)
      const notes = await Promise.all(entries.map(async (note) => {
        // ponytail: stale Snap ids remain after purge; prune on write if these bounded arrays grow.
        const links = await Promise.all(note.snapIds.map(async (snapId) => {
          const snap = await ctx.db.get(snapId)
          if (!snap || snap.deletedAt !== undefined) return null
          const game = await ctx.db.get(snap.sourceGameId)
          if (!game || game.deletedAt !== undefined || game.workspaceId !== workspace._id) return null
          return { snapId, sourceGameId: game._id, sourceGameLabel: game.label, order: snap.order,
            ...(snap.core.clipNumber !== undefined ? { clipNumber: snap.core.clipNumber } : {}) }
        }))
        return { ...note, snaps: links.filter((snap) => snap !== null) }
      }))
      return { ...player, notes, clipCount: new Set(notes.flatMap((note) => note.snaps.map((snap) => snap.snapId))).size }
    }))
  },
})

export const create = mutation({
  args: { workspaceId: v.id('workspaces'), jersey: v.string(), position: v.string(), group: positionGroupValidator, name: v.optional(v.string()) },
  returns: v.id('opponentPlayers'),
  handler: async (ctx, args) => {
    await requireLiveWorkspace(ctx, args.workspaceId)
    return ctx.db.insert('opponentPlayers', {
      workspaceId: args.workspaceId, jersey: normalizeJersey(args.jersey), position: normalizePosition(args.position), group: args.group,
      name: profileText(args.name ?? '', 'Name', PLAYER_NAME_MAX_LENGTH), details: '', traits: [],
      summary: '', tendency: '', assignment: '', createdAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    playerId: v.id('opponentPlayers'), jersey: v.optional(v.string()), position: v.optional(v.string()),
    group: v.optional(positionGroupValidator), name: v.optional(v.string()), details: v.optional(v.string()),
    grade: v.optional(v.union(gradeValidator, v.null())), traits: v.optional(v.array(v.string())),
    summary: v.optional(v.string()), tendency: v.optional(v.string()), assignment: v.optional(v.string()),
  }, returns: v.null(),
  handler: async (ctx, args) => {
    const player = await requireLivePlayer(ctx, args.playerId)
    await ctx.db.patch(player._id, {
      ...(args.jersey !== undefined ? { jersey: normalizeJersey(args.jersey) } : {}),
      ...(args.position !== undefined ? { position: normalizePosition(args.position) } : {}),
      ...(args.group !== undefined ? { group: args.group } : {}),
      ...(args.name !== undefined ? { name: profileText(args.name, 'Name', PLAYER_NAME_MAX_LENGTH) } : {}),
      ...(args.details !== undefined ? { details: profileText(args.details, 'Details', PLAYER_DETAILS_MAX_LENGTH) } : {}),
      ...(args.grade !== undefined ? { grade: args.grade ?? undefined } : {}),
      ...(args.traits !== undefined ? { traits: normalizeTraits(args.traits) } : {}),
      ...(args.summary !== undefined ? { summary: profileText(args.summary, 'Summary', PLAYER_PROFILE_TEXT_MAX_LENGTH) } : {}),
      ...(args.tendency !== undefined ? { tendency: profileText(args.tendency, 'Tendency', PLAYER_PROFILE_TEXT_MAX_LENGTH) } : {}),
      ...(args.assignment !== undefined ? { assignment: profileText(args.assignment, 'Our job', PLAYER_PROFILE_TEXT_MAX_LENGTH) } : {}),
    })
    return null
  },
})

export const remove = mutation({
  args: { playerId: v.id('opponentPlayers') }, returns: v.string(),
  handler: async (ctx, args) => {
    const player = await requireLivePlayer(ctx, args.playerId)
    const notes = (await ctx.db.query('playerNotes').withIndex('by_player', (q) => q.eq('playerId', player._id)).collect())
      .filter((note) => note.deletedAt === undefined)
    return softDeleteBatch(ctx, { kind: 'opponentPlayer', label: `#${player.jersey} ${player.position}`,
      records: [{ table: 'opponentPlayers', id: player._id }, ...notes.map((note) => ({ table: 'playerNotes' as const, id: note._id }))] })
  },
})

export const createNote = mutation({
  args: { playerId: v.id('opponentPlayers'), text: v.string(), snapIds: v.array(v.id('snaps')) }, returns: v.id('playerNotes'),
  handler: async (ctx, args) => {
    const player = await requireLivePlayer(ctx, args.playerId)
    const fields = await noteFields(ctx, player, args.text, args.snapIds)
    return ctx.db.insert('playerNotes', { workspaceId: player.workspaceId, playerId: player._id, ...fields, createdAt: Date.now() })
  },
})

export const updateNote = mutation({
  args: { noteId: v.id('playerNotes'), text: v.string(), snapIds: v.array(v.id('snaps')) }, returns: v.null(),
  handler: async (ctx, args) => {
    const note = await requireLiveNote(ctx, args.noteId)
    const player = await requireLivePlayer(ctx, note.playerId)
    await ctx.db.patch(note._id, await noteFields(ctx, player, args.text, args.snapIds))
    return null
  },
})

export const removeNote = mutation({
  args: { noteId: v.id('playerNotes') }, returns: v.string(),
  handler: async (ctx, args) => {
    const note = await requireLiveNote(ctx, args.noteId)
    return softDeleteBatch(ctx, { kind: 'playerNote', label: 'Player Note', records: [{ table: 'playerNotes', id: note._id }] })
  },
})
