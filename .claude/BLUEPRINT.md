# film-study-buddy — Implementation Blueprint

Authoritative build plan for the V1 defined in `.claude/SPEC.md`. Terminology is fixed by
`ubiquitous-language.md`; this document never redefines a term, it only says how it is built.
Execution order lives in `.claude/TASKS.md`.

---

## 1. Purpose

A single-coach desktop companion that converts Hudl film-study data and coaching observations
into structured, reusable opponent notebooks. It counts and organizes; the coach interprets.

The build succeeds when the twenty-one bullets of SPEC §113 are demonstrable end to end in a
packaged Electron app.

---

## 2. Architecture Decisions

Each decision below is fixed for V1. Reversing one is a blueprint change, not an implementation
choice.

| # | Decision | Rationale | Reversibility |
| --- | --- | --- | --- |
| D1 | Convex is the source of truth for all application data | Directed by the project owner; overrides the local-first reading of SPEC §3 | Hard — the whole data layer |
| D2 | No authentication; one Convex deployment per coach | SPEC §91. Deployment URL is the only tenancy boundary | Easy |
| D3 | Electron renderer talks to Convex directly over `ConvexReactClient` | No second backend tier to maintain; Electron main stays a window host | Easy |
| D4 | Convex `useQuery` is the application state store | Reactive, cached, invalidation-free. No Redux/Zustand/TanStack Query | Easy |
| D5 | Autosave is a debounced Convex mutation with an optimistic update | SPEC §89 forbids a Save button; optimistic updates keep the Play Log at typing speed | Easy |
| D6 | PDF export uses Electron `webContents.printToPDF` against the Report Preview route | Native, zero dependencies, real CSS page breaks. Beats react-pdf and headless Chrome | Medium |
| D7 | Play Log is TanStack Table (headless) rendered into a plain `<table>` | Column resize, reorder, visibility, and sorting are built in. Replaces ~1500 lines | Medium |
| D8 | Play Designer is hand-written SVG with pointer events | The same markup renders in the editor, the gallery, the report, and the PDF | Medium |
| D9 | Reordering uses native HTML5 drag-and-drop plus keyboard move buttons | SPEC §23/§34/§80 need drag; SPEC accessibility needs keys. No dnd library | Easy |
| D10 | Derived values (Field Zone, Down and Distance Situation, provenance) are pure functions in `convex/domain/`, never stored | One implementation shared by server aggregation and client display; no drift | Easy |
| D11 | Template Analysis Data is an embedded record on the Snap, keyed by Template Field id | One document read per Snap instead of N. Deleted fields leave recoverable orphan values | Medium |
| D12 | Soft deletion is a `deletedAt` + `deleteBatchId` pair plus a `deletions` ledger row | One Undo restores an entire parent/child hierarchy by batch id (SPEC §87) | Easy |
| D13 | Purge of expired soft deletes is a Convex daily cron | Native scheduling, no app-launch sweep to get wrong | Easy |
| D14 | CSV parsing uses Papa Parse | Quoted fields, embedded commas and newlines in Hudl exports. Correctness over a hand-rolled split | Easy |
| D15 | Routing is `react-router` in `HashRouter` mode | Deep nested URLs with ids; hash routing survives `file://` in the packaged app | Easy |

### Known Limitation (accepted)

Convex is a hosted service. SPEC §3 ("all core functionality must work without an internet
connection") is **not satisfied** by D1. With no network the app renders its shell and the
locally persisted theme, and every data screen shows a disconnected state. Restoring SPEC §3
means replacing D1 with an embedded local database; nothing else in this blueprint depends on
Convex specifically beyond the `convex/` directory and the hooks in `src/lib/db/`.

---

## 3. Stack

- **Shell**: Electron 44, `electron-vite`, one `BrowserWindow`, `contextIsolation` on,
  `sandbox` on. Main process owns window chrome, the native appearance signal, and PDF export.
- **Renderer**: React 19, TypeScript strict, Tailwind 4, ShadCN components (vendored, not a
  dependency), `lucide-react` icons.
- **Backend**: Convex — schema, queries, mutations, actions, crons.
- **Added dependencies**: `react-router`, `@tanstack/react-table`, `papaparse`
  (+ `@types/papaparse`), and `@anthropic-ai/sdk` for Phase 10C Report generation.

---

## 4. Repository Layout

```text
film-study-buddy/
├── electron/
│   ├── main.ts                  # window, app lifecycle, IPC handlers
│   └── preload.ts               # contextBridge: exportPdf, nativeTheme
├── convex/
│   ├── schema.ts                # every table and index
│   ├── crons.ts                 # daily purge of expired soft deletes
│   ├── domain/                  # PURE TypeScript, imported by both convex/ and src/
│   │   ├── core-fields.ts       # Core Snap field registry: key, label, type, options
│   │   ├── field-zone.ts        # Yard Line -> Field Zone
│   │   ├── situation.ts         # Down + Distance -> Down and Distance Situation
│   │   ├── provenance.ts        # imported vs current -> Imported | Coach Entered | Coach Edited
│   │   ├── terminology.ts       # built-in Formations, Motions, Play Concepts
│   │   ├── starter-templates.ts # the eleven Starter Coaching Templates
│   │   ├── aggregate.ts         # group Snaps -> Opponent Data rows
│   │   └── csv-mapping.ts       # column signature, Hudl header aliases, row coercion
│   ├── settings.ts              # singleton: coaching area, active season, first launch
│   ├── seasons.ts
│   ├── workspaces.ts            # includes archive / unarchive
│   ├── source-games.ts          # includes template reassignment
│   ├── templates.ts             # templates, sections, fields, views
│   ├── snaps.ts                 # CRUD, bulk edit, duplicate, must review
│   ├── import.ts                # mapping memory, duplicate detection, commit
│   ├── notes.ts                 # Quick Notes and Cell Notes
│   ├── diagrams.ts
│   ├── opponent-data.ts         # aggregation queries
│   ├── tendencies.ts
│   ├── reports.ts
│   ├── aiReports.ts             # included Workspace brief and Generated Report materialization
│   ├── aiReportsNode.ts         # server-only Claude generation action
│   ├── deletions.ts             # soft delete, undo, purge
│   └── theme-settings/
│       └── preferences.ts       # existing
├── src/
│   ├── main.tsx  app.tsx  index.css  convex-client.ts
│   ├── routes/                  # one file per screen, route table in routes.tsx
│   ├── features/
│   │   ├── theme-settings/      # existing
│   │   ├── first-launch/
│   │   ├── seasons/
│   │   ├── workspaces/
│   │   ├── templates/
│   │   ├── play-log/
│   │   ├── import/
│   │   ├── notes/
│   │   ├── review/
│   │   ├── designer/
│   │   ├── opponent-data/
│   │   ├── tendencies/
│   │   └── reports/
│   ├── components/              # app-sidebar, error-boundary, ui/ (ShadCN)
│   └── lib/
│       ├── db/                  # useAutosave, useUndoableMutation, optimistic helpers
│       ├── reorder.ts           # shared HTML5 drag + keyboard move hook
│       └── shortcuts.ts         # fixed keyboard map (SPEC §50)
└── .claude/  SPEC.md  BLUEPRINT.md  TASKS.md  CLAUDE.md
```

A feature directory owns its components, hooks, and pure helpers. A route file composes a
feature; it holds no business logic. Cross-feature reuse goes to `src/lib/` or
`convex/domain/`, never feature-to-feature.

---

## 5. Data Model

Every table below carries `deletedAt?: number` and `deleteBatchId?: string` unless marked
*(hard delete)*. All timestamps are epoch milliseconds.

### 5.1 Configuration

**`settings`** *(hard delete; singleton — exactly one document)*
`coachingArea: string`, `firstLaunchCompletedAt?: number`, `activeSeasonId?: Id<'seasons'>`,
`themePreference: 'light' | 'dark' | 'system'`.

**`importMappings`** *(hard delete)*
`signature: string` (SHA-1 of the sorted, normalized CSV header list),
`mapping: Record<string, string | null>` (CSV column → Core Snap field key or null),
`lastUsedAt: number`. Index `by_signature`.

**`columnLayouts`** *(hard delete)*
`sourceGameId`, `viewId?: Id<'templateViews'>`, `visible: string[]`, `order: string[]`,
`widths: Record<string, number>`. Index `by_sourceGame`. Holds SPEC §39 persistence. Sort and
search are deliberately absent — they are component state.

### 5.2 Organizational Hierarchy

**`seasons`** — `name: string`, `createdAt`. Index `by_deletedAt`.

**`workspaces`** — `seasonId`, `opponentName`, `week: number`, `gameDate?`, `yourTeam?`,
`notes?`, `archivedAt?: number`, `createdAt`. Indexes `by_season`, `by_season_archived`.

**`sourceGames`** — `workspaceId`, `label`, `templateId`, `createdAt`. Index `by_workspace`.

### 5.3 Coaching Templates

**`templates`** — `name`, `coachingArea`, `isStarter: boolean`, `createdAt`.

**`templateSections`** — `templateId`, `name`, `order: number`. Index `by_template`.

**`templateFields`** — `templateId`, `sectionId`, `name`,
`type: 'shortText' | 'longText' | 'number' | 'checkbox' | 'select' | 'multiSelect' | 'rating' | 'tags'`,
`options: string[]` (empty for non-select types), `required: boolean`,
`carryForward: boolean`, `order: number`. Indexes `by_template`, `by_section`.

**`templateViews`** *(hard delete)* — `templateId`, `name`, `visibleColumns: string[]`,
`columnOrder: string[]`. Index `by_template`. A view names columns by key:
`core:formation` or `field:<templateFieldId>`.

### 5.4 Snaps

**`snaps`**
```ts
{
  sourceGameId: Id<'sourceGames'>,
  order: number,                       // charting order; import assigns 1..n
  core: {
    clipNumber?: string, playNumber?: string, quarter?: number, clock?: string,
    down?: number, distance?: number,
    yardLine?: { side: 'own' | 'mid' | 'opp', yard: number },
    hash?: 'Left' | 'Middle' | 'Right',
    personnel?: string, formation?: string, motion?: string,
    playType?: PlayType, playConcept?: string, direction?: Direction,
    yards?: number,
  },
  imported?: Record<string, string>,   // core field key -> original Hudl string
  analysis: Record<string, AnalysisValue>, // templateFieldId -> string|number|boolean|string[]
  mustReview: boolean,
  createdAt: number,
}
```
Indexes `by_sourceGame` (with `order`), `by_sourceGame_mustReview`.

Provenance is **derived**, never stored: a key present in `imported` and equal to the current
value is `Imported`; present and unequal is `Coach Edited` (restore = copy `imported[k]` back);
absent is `Coach Entered`. Field Zone and Down and Distance Situation are likewise derived.

**`cellNotes`** — `snapId`, `fieldKey: string`, `text`. Index `by_snap`. One note per
(snap, field); upsert semantics, hard-deleted when emptied.

**`bulkEdits`** *(hard delete)* — `sourceGameId`, `createdAt`,
`changes: Array<{ snapId, fieldKey, before: AnalysisValue | null }>`. Written before a bulk
edit applies; Undo replays `before` values. Purged with the same cron.

### 5.5 Observations

**`quickNotes`** — `sourceGameId`, `snapId?`, `text`, `tags: string[]`, `createdAt`.
Index `by_sourceGame`.

**`opponentPlayers`** — `workspaceId`, `jersey`, `position`, `group` (QB/RB/WR/OL or
DL/LB/DB), `name`, `details`, optional `grade` (A/B/C), `traits: string[]`, `summary`,
`tendency`, `assignment`, `createdAt`. Index `by_workspace`. Shared across the Workspace's
Source Games. Profile text autosaves; deleting a player includes its live Player Notes.

**`playerNotes`** — `workspaceId`, `playerId`, `text`, `snapIds: Id<'snaps'>[]`, `createdAt`.
Indexes `by_workspace`, `by_player`. Chronological entries with at most 20 linked Snaps from
the same Workspace. Reads omit dead Snaps and deleted Source Games; `clipCount` counts distinct
live linked Snaps per Opponent Player. Both tables join Workspace Soft Deletion and Undo.

**`diagrams`** — `sourceGameId`, `snapId?`, `name?`, `note?`,
`players: Array<{ id, side: 'offense' | 'defense', x: number, y: number, label?, jersey? }>`,
`shapes: Array<{ id, tool: 'arrow' | 'curve' | 'block' | 'dashed' | 'free', points: number[] }>`,
`updatedAt`. Indexes `by_sourceGame`, `by_snap`. Coordinates are normalized 0–1 so the same
document renders at any size, including the PDF.

### 5.6 Analysis and Reporting

**`tendencyCategories`** *(hard delete)* — `name`, `isDefault: boolean`.

**`tendencies`** — `workspaceId`, `title`, `category`, `note`, `diagramId?`,
`includeInReport: boolean`, `createdAt`, and a frozen
`snapshot: { gameIds: Id<'sourceGames'>[], groupBy: string, groupBy2?: string,
rows: Array<{ values: string[], snaps: number, frequency: number, avgYards: number | null }> }`.
Never recomputed (SPEC §65).

**`reports`** — `workspaceId`, `name`, `intent: 'coach' | 'player'`,
`showClipReferences: boolean`, `blocks: Block[]`, `updatedAt`. Index `by_workspace`.

`Block` is a discriminated union stored inline, each carrying its own content snapshot:
```ts
| { id, type: 'heading',      text: string }
| { id, type: 'text',         text: string }
| { id, type: 'dataTable',    title: string, columns: string[], rows: string[][] }
| { id, type: 'tendency',     title, category, note, rows, diagram?: DiagramDoc }
| { id, type: 'diagram',      caption?: string, diagram: DiagramDoc }
| { id, type: 'selectedPlays',fields: string[], rows: Array<Record<string, string>> }
| { id, type: 'quickNotes',   notes: Array<{ text: string, tags: string[] }> }
```
Blocks hold copied values, not ids (SPEC §71). Duplicating a Coach Report as a Player Report is
a deep copy of the array, which is why it is independent by construction (SPEC §70).

Phase 10C adds Generated Reports: Claude selects ordered Blocks for a Coaching Area from an
included Workspace brief, and the existing Block builder copies real Report Snapshots into a
new, fully editable Report; model-written prose remains subject to the coach's review.

### 5.7 Deletion Ledger

**`deletions`** *(hard delete)* — `batchId: string`, `kind: string`, `label: string`,
`createdAt: number`, `undoneAt?: number`. Index `by_batchId`, `by_createdAt`.

One row per user-facing delete. Every record soft-deleted by that action carries the same
`deleteBatchId`. Undo clears `deletedAt` and `deleteBatchId` on every record in the batch and
stamps `undoneAt`. Purge removes ledger rows and their records after 24 hours.

---

## 6. Backend Function Surface

Naming: `list*` / `get*` are queries; everything else is a mutation. Every mutation validates
its arguments with Convex validators and filters `deletedAt === undefined` on reads.

| Module | Functions |
| --- | --- |
| `settings` | `get`, `completeFirstLaunch`, `setActiveSeason`, `setThemePreference` |
| `seasons` | `list`, `create`, `rename`, `remove` |
| `workspaces` | `listBySeason`, `listArchived`, `get`, `getOverview`, `create`, `update`, `archive`, `unarchive`, `remove` |
| `sourceGames` | `listByWorkspace`, `get`, `create`, `rename`, `changeTemplate`, `remove` |
| `templates` | `list`, `getFull`, `create`, `duplicate`, `rename`, `remove`, `addSection`, `renameSection`, `reorderSections`, `removeSection`, `addField`, `updateField`, `addFieldOption`, `reorderFields`, `removeField`, `listViews`, `saveView`, `removeView` |
| `snaps` | `listBySourceGame`, `get`, `create`, `updateCore`, `updateAnalysis`, `restoreImportedValue`, `duplicate`, `remove`, `removeMany`, `setMustReview`, `bulkUpdate`, `undoBulkUpdate`, `countIncomplete` |
| `import` | `getRememberedMapping`, `detectDuplicates`, `commit`, `rememberMapping` |
| `notes` | `listQuickNotes`, `createQuickNote`, `updateQuickNote`, `removeQuickNote`, `listCellNotes`, `setCellNote` |
| `opponentPlayers` | `listByWorkspace`, `create`, `update`, `remove`, `createNote`, `updateNote`, `removeNote` |
| `diagrams` | `listBySourceGame`, `get`, `create`, `save`, `remove` |
| `opponentData` | `aggregate({ workspaceId, gameIds, groupBy, groupBy2? })`, `listGroupingFields({ workspaceId })` |
| `tendencies` | `listByWorkspace`, `create`, `update`, `remove`, `listCategories`, `createCategory` |
| `reports` | `listByWorkspace`, `get`, `create`, `duplicateAsPlayerReport`, `rename`, `setBlocks`, `remove` |
| `deletions` | `undo({ batchId })`, `listRecent` (internal), `purgeExpired` (internal, cron) |

CSV parsing happens in the renderer (the file never leaves the machine until commit);
`import.commit` receives already-parsed, already-mapped rows and writes Snaps in one mutation.

---

## 7. Cross-Cutting Mechanics

### 7.1 Autosave (SPEC §89)

`useAutosave(value, save)` in `src/lib/db/`: holds a local draft, debounces 400 ms, flushes on
blur, on unmount, and on `beforeunload`. Play Log cell commits flush immediately on
Enter/Tab/blur; long text debounces. Every save path uses a Convex optimistic update so the
grid never flickers back to the old value. There is no Save button anywhere in the product.

### 7.2 Soft Deletion and Undo (SPEC §86–§88)

Every delete mutation: mint a `batchId`, stamp `deletedAt`/`deleteBatchId` on the record and on
every dependent record in the hierarchy, insert one `deletions` row, return the `batchId`. The
UI shows a toast with a single Undo action wired to `deletions.undo`. Bulk edits use the same
toast shape backed by `snaps.undoBulkUpdate`.

Hierarchies that cascade as one batch:
- Workspace → Source Games → Snaps, Quick Notes, Cell Notes, Diagrams; plus Tendencies, Reports, Opponent Players and Player Notes
- Source Game → Snaps, Quick Notes, Cell Notes, Diagrams
- Snap → Cell Notes, its Diagram, Quick Notes bound to it
- Template → Sections → Fields → Views (Snap analysis values are left in place, recoverable)
- Template Field → the field only; values stay as orphans in `snaps.analysis`

### 7.3 Provenance and Restore (SPEC §14)

Imported cells render a subtle marker. Editing one keeps `imported[key]` untouched, so
`Coach Edited` is computed and Restore is a one-field write. Restore is offered in Play Detail
and in the cell editor popover.

### 7.4 Reordering (SPEC §23, §34, §80)

`useReorder` in `src/lib/reorder.ts` returns the props for native `draggable` handles plus
`Move up` / `Move down` buttons for keyboard and screen-reader users. Used by template sections,
template fields, Play Log column headers, and Report blocks. Persisting a reorder writes the new
`order` values (templates) or the new array (report blocks) in one mutation.

### 7.5 Keyboard Shortcuts (SPEC §50)

Fixed, non-configurable, declared once in `src/lib/shortcuts.ts`:
arrow keys move the Play Log cell cursor; `Enter` opens the cell editor and commits;
`Tab`/`Shift+Tab` move horizontally; `Esc` cancels an edit; `Cmd/Ctrl+Enter` opens Play Detail;
`Cmd/Ctrl+R` toggles Must Review; `Cmd/Ctrl+N` creates the next Snap with carry-forward;
`Cmd/Ctrl+F` focuses search; `Cmd/Ctrl+Z` triggers the active Undo toast;
`J`/`K` move Next/Previous inside Focused Review Mode. Enter never creates a row (SPEC §98).

### 7.6 Loading, Empty, and Error States

Convex `useQuery` returns `undefined` while loading — every consuming component renders a
skeleton, never a blank. Every list has a purposeful empty state with its primary action
(Source Games → Import Hudl CSV). The existing `ErrorBoundary` wraps each route; the Convex
disconnected banner sits in the app shell.

---

## 8. Screen Inventory

The twenty-four screens of SPEC §110 mapped to routes and owning features.

| # | Screen | Route | Feature |
| --- | --- | --- | --- |
| 1 | First Launch Setup | `/welcome` | first-launch |
| 2 | Home | `/` | workspaces |
| 3 | Season View | `/seasons/:seasonId` | seasons |
| 4 | Create Opponent | `/seasons/:seasonId/new` (dialog) | workspaces |
| 5 | Weekly Opponent Overview | `/w/:workspaceId` | workspaces |
| 6 | Source Games List | `/w/:workspaceId/games` | workspaces |
| 7 | Add Source Game | `/w/:workspaceId/games/new` (dialog) | workspaces |
| 8 | Hudl CSV Import / Mapping | `/w/:workspaceId/games/:gameId/import` | import |
| 9 | Hudl Import Preview | same route, step 2 | import |
| 10 | Play Log | `/w/:workspaceId/games/:gameId` | play-log |
| 11 | Play Detail | `/w/:workspaceId/games/:gameId/snap/:snapId` | play-log |
| 12 | Quick Notes | `/w/:workspaceId/games/:gameId/notes` | notes |
| 13 | Must Review Queue | `/w/:workspaceId/games/:gameId/review` | review |
| 14 | Play Diagram Gallery | `/w/:workspaceId/games/:gameId/diagrams` | designer |
| 15 | Play Designer | `.../diagrams/:diagramId` | designer |
| 16 | Opponent Data | `/w/:workspaceId/data` | opponent-data |
| 17 | Tendencies / Alerts | `/w/:workspaceId/tendencies` | tendencies |
| 18 | Report List | `/w/:workspaceId/reports` | reports |
| 19 | Report Builder | `/w/:workspaceId/reports/:reportId` | reports |
| 20 | Report Preview | `/w/:workspaceId/reports/:reportId/preview` | reports |
| 21 | Coaching Templates | `/templates` | templates |
| 22 | Template Builder | `/templates/:templateId` | templates |
| 23 | Settings | `/settings` | theme-settings |
| 24 | Archived Opponents | `/archive` | workspaces |

Layout (Film Room design, Sept 2026): a top header carries the brand, coaching area and links to Templates, Settings, Archive; sub-screens show a Home link and their title. There is no sidebar. Inside a workspace a
secondary tab strip carries Overview, Source Games, Opponent Data, Tendencies, Reports
(SPEC §7). Inside a Source Game a third strip carries Play Log, Quick Notes, Must Review,
Play Diagrams (SPEC §10). Density over comfort: compact rows, small controls, minimal chrome
(SPEC §109).

---

## 9. Invariants

1. Core Snap Data survives a template change; Template Analysis Data does not (SPEC §100).
2. A Source Game has exactly one Coaching Template at any time (SPEC §99).
3. A Tendency exists only if it was created from an Opponent Data result (SPEC §64).
4. A Tendency snapshot and a Report block never change when their source changes (SPEC §65, §71).
5. A Player Report shares no mutable state with its source Coach Report (SPEC §70).
6. Deleting is never immediate loss: 24 hours plus one Undo (SPEC §86).
7. Archive is not deletion and is reversible (SPEC §84).
8. Required fields warn, never block (SPEC §29, §103).
9. The application never labels a play good, bad, or successful (SPEC §59, §107).
10. There is no Save button (SPEC §89).
11. Two different terminology strings are two different values; no aliasing (SPEC §96).
12. Enter does not create a Snap (SPEC §98).

---

## 10. Failure Modes and Edge Cases

| Area | Case | Required behavior |
| --- | --- | --- |
| Convex | No `VITE_CONVEX_URL`, or offline | Shell renders, theme works, data screens show a disconnected state with a retry. Never a blank window |
| CSV | Malformed, empty, or non-CSV file | Named parse error at the upload step; no partial import |
| CSV | Headers changed since last import | Mapping screen reappears with best-effort prefills (SPEC §11) |
| CSV | Required column missing | Mapping screen blocks Continue and names the missing field |
| CSV | Unparseable cell (`"1st"` in Down) | Row imports; the cell stays empty and is flagged in Preview. Never silently coerced |
| CSV | Special teams / no-play rows | Flagged in Preview, pre-checked for exclusion, never auto-removed (SPEC §12) |
| CSV | Re-import into a populated Source Game | Duplicates flagged by clip #, then play #, then quarter+clock. Coach decides (SPEC §13) |
| Templates | Delete a field holding data | Warn, name the count, confirm, soft-delete, offer Undo (SPEC §31) |
| Templates | Add a field mid-study | Appears on existing Snaps, blank. No backfill, no data loss (SPEC §30) |
| Templates | Change a Source Game's template with analysis present | Warn, confirm, soft-delete analysis as one batch, keep Core Snap Data (SPEC §100) |
| Templates | Remove a select option still in use | Existing values persist and display; the option is gone from the picker |
| Play Log | Two windows editing one Snap | Last write wins per field; Convex reactivity refreshes the other view |
| Play Log | Bulk edit over 200 rows | Single mutation, single `bulkEdits` row, single Undo (SPEC §41) |
| Field position | `OPP 0`, `OWN 0`, yard > 50 on a side | Reject at the input; the structured editor cannot express an invalid spot (SPEC §22) |
| Opponent Data | Grouping field is blank on some Snaps | A distinct `(none)` group. Never dropped, never guessed |
| Opponent Data | Zero Snaps in scope | Empty result with an explanation, not a zero-row table |
| Opponent Data | Average yards where no Snap has yards | `—`, not `0.0` |
| Tendencies | Source Snaps later deleted | Snapshot is unaffected by design |
| Designer | Player object dragged off canvas | Clamped to bounds |
| Reports | Empty report exported | Valid PDF containing the header only |
| Reports | Very long text or a 40-page report | Paginates; page breaks avoid splitting a table row or a diagram |
| PDF | Export fails or the path is unwritable | Surfaced error; the report is untouched |
| Purge | Cron runs while a record is being restored | Purge only touches rows older than 24 hours with no `undoneAt` |

---

## 11. Verification Strategy

- **Type checking**: `npm run typecheck` (`tsc --noEmit`) must be clean. Strict mode, no `any`
  outside a narrowing boundary.
- **Unit tests**: `node --test` on the pure modules in `convex/domain/` — field zone, situation,
  provenance, CSV mapping and coercion, duplicate detection, aggregation. These hold every
  non-trivial branch in the product; UI is verified by hand.
- **Build**: `npm run build` (typecheck + tests + `electron-vite build`) must pass, and the
  packaged app must launch.
- **Manual acceptance**: the SPEC §111 journey walked end to end on real Hudl CSV export,
  finishing with two exported PDFs and an archived workspace.

---

## 12. Out of Scope

Everything in SPEC §2 and SPEC §114. Specifically not built: authentication, collaboration,
cloud sync beyond the coach's own Convex deployment, video of any kind, backup/restore,
automatic tendency detection, saved filters or scopes, formation presets, report theming, and
custom Core Snap fields.
