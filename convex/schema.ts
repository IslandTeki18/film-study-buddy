import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { TEMPLATE_FIELD_TYPES } from './domain/templateFields.ts'
import { DIRECTIONS, HASHES, PLAY_TYPES } from './domain/coreFields.ts'

const softDelete = {
  deletedAt: v.optional(v.number()),
  deleteBatchId: v.optional(v.string()),
}

const hashValidator = v.union(...HASHES.map((value) => v.literal(value)))
const playTypeValidator = v.union(...PLAY_TYPES.map((value) => v.literal(value)))
const directionValidator = v.union(...DIRECTIONS.map((value) => v.literal(value)))

export const analysisValueValidator = v.union(
  v.string(), v.number(), v.boolean(), v.array(v.string()),
)

const playerValidator = v.object({
  id: v.string(),
  side: v.union(v.literal('offense'), v.literal('defense')),
  x: v.number(),
  y: v.number(),
  label: v.optional(v.string()),
  jersey: v.optional(v.string()),
})
const shapeValidator = v.object({
  id: v.string(),
  tool: v.union(
    v.literal('arrow'), v.literal('curve'), v.literal('block'),
    v.literal('dashed'), v.literal('free'),
  ),
  points: v.array(v.number()),
})
const diagramSnapshotValidator = v.object({
  name: v.optional(v.string()),
  note: v.optional(v.string()),
  players: v.array(playerValidator),
  shapes: v.array(shapeValidator),
  updatedAt: v.number(),
})
const tendencyRowValidator = v.object({
  values: v.array(v.string()),
  snaps: v.number(),
  frequency: v.number(),
  avgYards: v.union(v.number(), v.null()),
})

export default defineSchema({
  settings: defineTable({
    coachingArea: v.string(),
    firstLaunchCompletedAt: v.optional(v.number()),
    activeSeasonId: v.optional(v.id('seasons')),
    themePreference: v.union(v.literal('light'), v.literal('dark'), v.literal('system')),
  }),
  importMappings: defineTable({
    signature: v.string(),
    mapping: v.record(v.string(), v.union(v.string(), v.null())),
    lastUsedAt: v.number(),
  }).index('by_signature', ['signature']),
  columnLayouts: defineTable({
    sourceGameId: v.id('sourceGames'),
    viewId: v.optional(v.id('templateViews')),
    visible: v.array(v.string()),
    order: v.array(v.string()),
    widths: v.record(v.string(), v.number()),
  }).index('by_sourceGame', ['sourceGameId']),

  seasons: defineTable({
    name: v.string(),
    createdAt: v.number(),
    ...softDelete,
  }).index('by_deletedAt', ['deletedAt']),
  workspaces: defineTable({
    seasonId: v.id('seasons'),
    opponentName: v.string(),
    week: v.number(),
    gameDate: v.optional(v.string()),
    yourTeam: v.optional(v.string()),
    notes: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    ...softDelete,
  })
    .index('by_season', ['seasonId'])
    .index('by_season_archived', ['seasonId', 'archivedAt']),
  sourceGames: defineTable({
    workspaceId: v.id('workspaces'),
    label: v.string(),
    templateId: v.id('templates'),
    createdAt: v.number(),
    ...softDelete,
  }).index('by_workspace', ['workspaceId']),

  templates: defineTable({
    name: v.string(),
    coachingArea: v.string(),
    isStarter: v.boolean(),
    createdAt: v.number(),
    ...softDelete,
  }),
  templateSections: defineTable({
    templateId: v.id('templates'),
    name: v.string(),
    order: v.number(),
    ...softDelete,
  }).index('by_template', ['templateId']),
  templateFields: defineTable({
    templateId: v.id('templates'),
    sectionId: v.id('templateSections'),
    name: v.string(),
    type: v.union(...TEMPLATE_FIELD_TYPES.map((value) => v.literal(value))),
    options: v.array(v.string()),
    required: v.boolean(),
    carryForward: v.boolean(),
    order: v.number(),
    ...softDelete,
  })
    .index('by_template', ['templateId'])
    .index('by_section', ['sectionId']),
  templateViews: defineTable({
    templateId: v.id('templates'),
    name: v.string(),
    visibleColumns: v.array(v.string()),
    columnOrder: v.array(v.string()),
  }).index('by_template', ['templateId']),

  snaps: defineTable({
    sourceGameId: v.id('sourceGames'),
    order: v.number(),
    core: v.object({
      clipNumber: v.optional(v.string()),
      playNumber: v.optional(v.string()),
      quarter: v.optional(v.number()),
      clock: v.optional(v.string()),
      down: v.optional(v.number()),
      distance: v.optional(v.number()),
      yardLine: v.optional(v.object({
        side: v.union(v.literal('own'), v.literal('mid'), v.literal('opp')),
        yard: v.number(),
      })),
      hash: v.optional(hashValidator),
      personnel: v.optional(v.string()),
      formation: v.optional(v.string()),
      motion: v.optional(v.string()),
      playType: v.optional(playTypeValidator),
      playConcept: v.optional(v.string()),
      direction: v.optional(directionValidator),
      yards: v.optional(v.number()),
    }),
    imported: v.optional(v.record(v.string(), v.string())),
    analysis: v.record(v.string(), analysisValueValidator),
    mustReview: v.boolean(),
    createdAt: v.number(),
    ...softDelete,
  })
    .index('by_sourceGame', ['sourceGameId', 'order'])
    .index('by_sourceGame_mustReview', ['sourceGameId', 'mustReview']),
  cellNotes: defineTable({
    snapId: v.id('snaps'),
    fieldKey: v.string(),
    text: v.string(),
    ...softDelete,
  }).index('by_snap', ['snapId']),
  bulkEdits: defineTable({
    sourceGameId: v.id('sourceGames'),
    createdAt: v.number(),
    changes: v.array(v.object({
      snapId: v.id('snaps'),
      fieldKey: v.string(),
      before: v.union(analysisValueValidator, v.null()),
    })),
  }),

  quickNotes: defineTable({
    sourceGameId: v.id('sourceGames'),
    snapId: v.optional(v.id('snaps')),
    text: v.string(),
    tags: v.array(v.string()),
    createdAt: v.number(),
    ...softDelete,
  }).index('by_sourceGame', ['sourceGameId']),
  diagrams: defineTable({
    sourceGameId: v.id('sourceGames'),
    snapId: v.optional(v.id('snaps')),
    name: v.optional(v.string()),
    note: v.optional(v.string()),
    // Coordinates are normalized to 0–1.
    players: v.array(playerValidator),
    shapes: v.array(shapeValidator),
    updatedAt: v.number(),
    ...softDelete,
  })
    .index('by_sourceGame', ['sourceGameId'])
    .index('by_snap', ['snapId']),

  tendencyCategories: defineTable({
    name: v.string(),
    isDefault: v.boolean(),
  }),
  tendencies: defineTable({
    workspaceId: v.id('workspaces'),
    title: v.string(),
    category: v.string(),
    note: v.string(),
    diagramId: v.optional(v.id('diagrams')),
    includeInReport: v.boolean(),
    createdAt: v.number(),
    snapshot: v.object({
      gameIds: v.array(v.id('sourceGames')),
      groupBy: v.string(),
      groupBy2: v.optional(v.string()),
      rows: v.array(tendencyRowValidator),
    }),
    ...softDelete,
  }).index('by_workspace', ['workspaceId']),
  reports: defineTable({
    workspaceId: v.id('workspaces'),
    name: v.string(),
    intent: v.union(v.literal('coach'), v.literal('player')),
    showClipReferences: v.boolean(),
    blocks: v.array(v.union(
      v.object({ id: v.string(), type: v.literal('heading'), text: v.string() }),
      v.object({ id: v.string(), type: v.literal('text'), text: v.string() }),
      v.object({
        id: v.string(),
        type: v.literal('dataTable'),
        title: v.string(),
        columns: v.array(v.string()),
        rows: v.array(v.array(v.string())),
      }),
      v.object({
        id: v.string(),
        type: v.literal('tendency'),
        title: v.string(),
        category: v.string(),
        note: v.string(),
        rows: v.array(tendencyRowValidator),
        diagram: v.optional(diagramSnapshotValidator),
      }),
      v.object({
        id: v.string(),
        type: v.literal('diagram'),
        caption: v.optional(v.string()),
        diagram: diagramSnapshotValidator,
      }),
      v.object({
        id: v.string(),
        type: v.literal('selectedPlays'),
        fields: v.array(v.string()),
        rows: v.array(v.record(v.string(), v.string())),
      }),
      v.object({
        id: v.string(),
        type: v.literal('quickNotes'),
        notes: v.array(v.object({ text: v.string(), tags: v.array(v.string()) })),
      }),
    )),
    updatedAt: v.number(),
    ...softDelete,
  }).index('by_workspace', ['workspaceId']),

  deletions: defineTable({
    batchId: v.string(),
    kind: v.string(),
    label: v.string(),
    createdAt: v.number(),
    undoneAt: v.optional(v.number()),
  })
    .index('by_batchId', ['batchId'])
    .index('by_createdAt', ['createdAt']),
})
