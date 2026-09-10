# Film Study Buddy — Ubiquitous Language

A local-first desktop companion for high school football coaches. It converts Hudl film-study
data and coaching observations into structured, reusable opponent notebooks. It is a notebook,
not an analytics platform: it counts and organizes, the coach interprets.

Source of truth for scope and terms: `.claude/SPEC.md` (V1 product spec). This file is the
glossary only — no implementation detail, no spec restatement.

## Organizational Hierarchy

**Season**:
The highest organizational level, identified by a year. Owns Weekly Opponent Workspaces.
_Avoid_: Year, campaign.

**Weekly Opponent Workspace**:
One week of preparation against one opponent, belonging to a Season. The unit that is archived
when the week is over.
_Avoid_: Opponent, week, game plan, project. Say "Workspace" only where the context is
unambiguous.

**Source Game**:
One piece of opponent film studied inside a Workspace, identified by its matchup. Holds a Play
Log, Quick Notes, a Must Review queue, and Play Diagrams, and uses exactly one Coaching
Template.
_Avoid_: Game, film, opponent game, clip set.

**Snap**:
One charted play from a Source Game. The atomic record of the product.
_Avoid_: Play, row, rep. "Play" is reserved for football concepts (Play Type, Play Concept,
Play Diagram), never for the record.

## Snap Data

**Core Snap Data**:
The standardized, template-independent fields on every Snap: Source / Clip #, Quarter, Clock,
Down, Distance, Yard Line, Hash, Personnel, Formation, Motion, Play Type, Play Concept,
Direction, Yards Gained / Lost. Coaches cannot add fields to it.
_Avoid_: Standard fields, base fields, system fields.

**Template Analysis Data**:
The values a Snap holds for the fields of its Source Game's Coaching Template. Distinct from
Core Snap Data, which survives a template change.
_Avoid_: Custom fields, extra data, analysis.

**Field Zone**:
A derived region of the field (Backed Up, Own Territory, Midfield, Plus Territory, Red Zone,
Goal Line) computed from Yard Line. Fixed in V1.
_Avoid_: Field position bucket, area.

**Down and Distance Situation**:
A derived situational grouping (for example 3rd & Long) computed from Down and Distance.
_Avoid_: Situation (ambiguous with the Tendency category of the same name), down bucket.

**Imported / Coach Entered / Coach Edited**:
The provenance state of a value. `Imported` came from a Hudl CSV untouched; `Coach Entered` was
never imported; `Coach Edited` is an imported value the coach changed, with the original value
retained and restorable.
_Avoid_: Dirty, modified, overridden.

**Hudl Reference**:
The identifiers stored with a Snap (Clip #, Play #, Quarter, Clock) that let the coach find the
play in Hudl. The only link between this application and video.
_Avoid_: Video link, clip link, timestamp.

## Charting

**Play Log**:
The spreadsheet-style charting surface of a Source Game, one row per Snap. The primary
film-study interface.
_Avoid_: Table, grid, chart, sheet.

**Play Log View**:
A named, saved combination of visible columns and column order belonging to a Coaching
Template. It holds no filters and no sorting.
_Avoid_: Layout, preset, filter, saved search.

**Carry-Forward Field**:
A field whose value copies from the previous Snap when the coach manually creates the next one.
_Avoid_: Sticky field, default, inherited value.

**Cell Note**:
A note attached to one field value of one Snap, rather than to the Snap as a whole.
_Avoid_: Comment, annotation.

**Play Detail**:
The full single-Snap view: Core Snap Data, Template Analysis Data, Cell Notes, original imported
values, Quick Note access, Must Review status, and Play Diagram.
_Avoid_: Snap detail, row detail, modal, inspector.

## Coaching Templates

**Coaching Template**:
A reusable, coach-customizable set of Sections and Fields defining the position-specific
analysis captured for each Snap. A Source Game uses exactly one.
_Avoid_: Form, schema, layout, profile. Say "Template" only where unambiguous.

**Starter Coaching Template**:
A Coaching Template shipped with the application for a coaching area (for example Defensive
Line), installed at First Launch and fully editable afterwards.
_Avoid_: Default template, preset, stock template.

**Section**:
A named group of Fields inside a Coaching Template (for example Run Game).
_Avoid_: Group, category (category belongs to Tendencies / Alerts), tab.

**Template Field**:
One typed input in a Coaching Template — Short Text, Long Text, Number, Checkbox, Single Select,
Multi-Select, Rating / Grade (fixed 1–5), or Tags. Optional unless explicitly marked Required.
_Avoid_: Column, attribute, property.

**Coaching Area**:
The coach's primary position responsibility chosen at First Launch (for example Linebackers,
Offensive Coordinator, Custom / General). Determines the Starter Coaching Template installed.
_Avoid_: Role, position, specialty.

**Completeness Warning**:
An informational notice that Snaps have unfinished Required fields. It never blocks the coach.
_Avoid_: Validation error, incomplete state, blocker.

## Observations

**Quick Note**:
A lightweight, tagged, chronological observation scoped to the Source Game where it was created.
It never enters the Must Review queue and is never promoted automatically.
_Avoid_: Note (ambiguous with Cell Note and Diagram Note), comment, observation.

**Must Review**:
A flag on a Snap marking it as needing another look. Flagged Snaps form the Source Game's Review
Queue; resolving one removes it.
_Avoid_: Flag, bookmark, todo, starred.

**Review Queue**:
The list of Must Review Snaps in a Source Game, worked through sequentially in Focused Review
Mode.
_Avoid_: Review list, flagged plays, inbox.

**Play Diagram**:
A saved drawing of a play, attached to a Snap, built from scratch in the Play Designer and
reusable as report content.
_Avoid_: Diagram alone where Diagram Note is nearby, drawing, sketch, whiteboard.

**Play Designer**:
The canvas where Player Objects and drawing tools produce a Play Diagram. No presets, no saved
arrangements.
_Avoid_: Editor, canvas, whiteboard.

**Player Object**:
A placed marker on the Play Designer canvas with a side (Offense / Defense), a position, an
optional position label, and an optional jersey number.
_Avoid_: Piece, token, dot, player.

**Diagram Note**:
The single free-text field belonging to a Play Diagram.
_Avoid_: Caption, annotation, comment.

## Analysis

**Opponent Data**:
The aggregation surface of a Weekly Opponent Workspace: Snaps from the selected Source Games,
grouped by one or two fields, reported as snap count, frequency, percentage, and average yards.
_Avoid_: Analytics, stats, reports (Reports is a separate concept), dashboard.

**Grouping Field**:
A Core Snap or Template Analysis field chosen as the grouping dimension of an Opponent Data
result (for example Formation, then Play Concept).
_Avoid_: Dimension, pivot, filter, facet.

**Tendency / Alert**:
A coach's saved conclusion: a Title, a Category, a frozen statistical snapshot of one Opponent
Data result, the coach's explanation, and an optional Play Diagram. It can only be created from
an Opponent Data result, never freehand.
_Avoid_: Insight, finding, pattern, key. "Tendency" alone is acceptable shorthand.

**Statistical Snapshot**:
The values copied into a Tendency / Alert at creation. It is never live-linked; later imports do
not change it.
_Avoid_: Live data, linked stats, cached result.

## Reporting

**Report**:
A multi-page document assembled from ordered Blocks inside a Weekly Opponent Workspace, exported
as PDF.
_Avoid_: Document, export, packet, printout.

**Coach Report**:
The comprehensive Report intent, aimed at staff and personal game planning. May include Hudl
clip references.
_Avoid_: Full report, internal report, staff report.

**Player Report**:
A Report created by duplicating a Coach Report and trimming it for players. Independent from its
source once duplicated.
_Avoid_: Simplified report, handout, player packet.

**Block**:
One unit of Report content, of a fixed V1 type: Heading, Text / Coach Notes, Opponent Data
Table, Tendency / Alert, Play Diagram, Selected Plays, or Quick Notes. Reorderable by drag and
drop.
_Avoid_: Section (Section belongs to Coaching Templates), widget, component, element.

**Report Snapshot**:
The copy of source content a Block stores when it is added. Later changes to the source never
alter the Report.
_Avoid_: Live block, linked content, reference.

## Lifecycle

**Archive**:
Moving a finished Weekly Opponent Workspace out of Current Opponents while preserving all its
data and its Season association. Reversible, and not deletion.
_Avoid_: Close, complete, hide, delete.

**Soft Deletion**:
Removing a record from the interface while keeping it recoverable for 24 hours, after which it
becomes eligible for permanent deletion.
_Avoid_: Trash, bin, archive (Archive is a distinct concept), disable.

**Undo**:
The single reversal offered after a destructive or bulk operation. For a parent record it
restores the whole soft-deleted hierarchy as one unit; for a bulk edit it restores every
affected value at once.
_Avoid_: Revert, rollback, restore, history.

**Autosave**:
The continuous persistence of routine work. There is no manual Save action anywhere in the
product.
_Avoid_: Save, sync, commit, draft.

## Import

**Hudl CSV Import**:
The preferred way to populate a Source Game: upload, detect columns, map fields, preview, and
confirm.
_Avoid_: Upload, sync, integration (there is no Hudl API in V1).

**Column Mapping**:
The correspondence between CSV columns and Core Snap fields. A successful mapping is remembered
locally and reused for CSV files of the same shape.
_Avoid_: Schema, field matching, transform.

**Import Preview**:
The step where the coach inspects the parsed rows and optionally excludes them before
confirming. Special-teams and no-play rows may be flagged but are never removed automatically.
_Avoid_: Dry run, staging, validation.

**Duplicate Snap Detection**:
The flagging of rows that likely match Snaps already in the Source Game. Flagged rows are never
blocked or deleted; the coach decides.
_Avoid_: Dedupe, conflict, merge.

**Duplicate Snap**:
A row action that copies a Snap's Core Snap Data and Template Analysis Data, and nothing else
(no Quick Notes, Cell Notes, Must Review status, or Play Diagram). Not related to Duplicate Snap
Detection despite the shared word.
_Avoid_: Copy, clone.

## Terminology Library

**Terminology Library**:
The built-in vocabulary of Formations, Motions, Play Concepts, Directions, and Play Types that
ships with the product, extendable inline while charting.
_Avoid_: Dictionary, taxonomy, tags, ontology.

**Custom Terminology**:
A Formation, Play Concept, or select option a coach adds inline during film study, which becomes
reusable afterwards. There are no aliases in V1: two different strings are two different values.
_Avoid_: Alias, synonym, variant.

## Non-Terms

Words the product deliberately does not use, because the concept does not exist in V1:

| Word | Why it is absent |
| --- | --- |
| User, account, sign-in, permission | No authentication; the application opens straight into the local notebook. |
| Sync, cloud, device | Installations are independent; the local machine owns the data. |
| Video, clip playback, timestamp | Film is watched in Hudl. Only Hudl References are stored. |
| Success rate, efficiency, significance | Statistics are objective counts and averages only; the coach interprets. |
| Team, roster, staff, share | Single-coach product; collaboration is post-V1. |
| Backup, restore, export database | Deferred past V1. PDF export is the only export. |
