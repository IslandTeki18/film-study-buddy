# High School Football Film Study Companion

## V1 Product Specification

## 1. Product Vision

The application is a desktop companion coaches use while watching opponent film in Hudl on another screen, browser, tablet, or phone.

Its purpose is to turn film observations into structured, reusable opponent data without forcing coaches to repeatedly recreate spreadsheets, notebooks, terminology, and reports.

The application should help coaches transform film study into information that affects:

- Coaching decisions
- Player corrections
- Scout-team preparation
- Practice reps
- Weekly game planning

The application is configurable for both offensive and defensive coaches rather than being position-specific.

---

## 2. V1 Scope

The core workflow is:

```text
Season
    ↓
Weekly Opponent Workspace
    ↓
Source Games
    ↓
Hudl CSV / Manual Snaps
    ↓
Coaching Template
    ↓
Spreadsheet Play Log
    ↓
Quick Notes / Must Review / Diagrams
    ↓
Opponent Data
    ↓
Tendencies & Alerts
    ↓
Report Builder
    ↓
Coach / Player PDF
```

### Explicitly Out of Scope for V1

- Authentication
- User accounts
- Team accounts
- Collaboration
- Sharing notes between coaches
- Cloud synchronization
- Multi-device synchronization
- Video playback
- Video hosting
- Hudl video integration
- Automated AI-generated tendencies
- Backup and restore
- Advanced analytics
- Custom Core Snap schemas
- Saved analytics scopes
- Opponent roster management
- Formation diagram presets
- Reusable play-diagram templates
- Advanced report design
- Custom report branding

---

## 3. Desktop / Local-First Architecture

The application must be local-first and offline-capable.

All core functionality must work without an internet connection.

This includes:

- Seasons
- Opponent workspaces
- Source games
- CSV imports
- Play Logs
- Coaching templates
- Quick Notes
- Must Review
- Play Diagrams
- Opponent Data
- Tendencies / Alerts
- Reports
- PDF generation

V1 requires no account or login.

Autosave

Autosave is continuous throughout the application.

The coach should not have to manually save routine work.

---

## 4. First Launch

On first launch, the coach selects their primary coaching area.

### Offense

- Quarterbacks
- Running Backs
- Wide Receivers
- Tight Ends
- Offensive Line
- Offensive Coordinator

### Defense

- Defensive Line
- Linebackers
- DB / Secondary
- Defensive Coordinator

### Other

- Custom / General

The application automatically installs an appropriate starter coaching template.

The coach can customize the starter template or create additional templates later.

---

## 5. Home Screen

The Home screen should remain minimal.

### Primary Content

- Current Season
- Current / Recent Opponents
- New Opponent

### Secondary Navigation

- Coaching Templates
- Settings
- Archived Opponents

Do not include:

- Dashboard analytics
- Activity feeds
- Team management
- Complex widgets

---

## 6. Seasons

The application uses seasons as its highest organizational level.

```text
Season
└── Weekly Opponent Workspaces
```

Example:

```text
2026 Season
├── Week 1 — Spanish Fork
├── Week 2 — Springville
├── Week 3 — Provo
└── Week 4 — Salem Hills
```

Season Creation

A season requires only:

- Season Name / Year

Example:
2026

The currently selected season becomes the default destination for newly created opponent workspaces.

Older seasons remain accessible.

---

## 7. Weekly Opponent Workspace

Each week of opponent preparation receives its own workspace.

### Required Fields

- Opponent Name
- Week

### Optional Fields

- Season / Year
- Game Date
- Your Team
- Notes

Workspace Navigation

```text
Overview
Source Games
Opponent Data
Tendencies / Alerts
Reports
```

## 8. Opponent Overview

The Overview should remain intentionally minimal.

Display:

- Opponent
- Week
- Source games
- Number of charted snaps
- Number of Must Review snaps
- Number of Tendencies / Alerts
- Basic report status
- Continue Film Study

The application does not determine when film study is complete.

The coach determines when they are finished.

---

## 9. Source Games

A Weekly Opponent Workspace can contain multiple source games.

Example:

```text
Opponent: Salem Hills

Source Games
├── Salem Hills vs Provo
├── Salem Hills vs Payson
└── Salem Hills vs Springville
```

Adding a Source Game

Required:

- Game label / matchup
- Coaching Template

Then choose:

- Import Hudl CSV
- Create Manually

Each Source Game uses exactly one coaching template.

Example:

```text
Salem Hills vs Provo
Template: Defensive Line
```

Once template-specific study data exists, changing the template requires a destructive-action warning.

---

## 10. Source Game Workspace

Each Source Game contains four primary areas:

```text
Play Log
Quick Notes
Must Review
Play Diagrams
```

The Play Log is the primary film-study interface.

---

## 11. Hudl CSV Import

The preferred empty-state action is:

Import Hudl CSV

The secondary action is:

Create Plays Manually

Import Workflow

```text
Upload CSV
    ↓
Detect Columns
    ↓
Auto-map Known Hudl Fields
    ↓
Map Unknown Fields
    ↓
Preview Snaps
    ↓
Optionally Exclude Rows
    ↓
Confirm Import
```

Remembered Mapping

Successful Hudl column mappings are stored locally.

Future CSV files with the same structure automatically reuse the previous mapping.

The mapping screen appears again when:

- Columns change
- Required columns disappear
- Unknown columns appear
- The previous mapping cannot safely be reused

---

## 12. Import Preview

The coach may optionally exclude rows before completing an import.

Examples include:

- Kickoffs
- Punts
- PATs
- Field goals
- No-play snaps
- Other irrelevant snaps

The application may automatically flag likely special-teams or no-play records.

It must not automatically remove them.

The coach retains final control.

---

## 13. Duplicate Detection

When importing additional CSV data into an existing Source Game, the application should detect likely duplicate snaps.

Potential identifiers include:

- Hudl clip number
- Hudl play number
- Quarter
- Clock
- Other available source identifiers

Duplicates are flagged.

Duplicates are not automatically blocked or deleted.

The coach decides whether they should be imported.

---

## 14. Imported Data Provenance

Hudl-imported values receive a subtle:

Imported

state.

Coach-created values receive:

Coach Entered

or:

Coach Edited

state.

If a coach modifies an imported value, preserve the original value.

Example:

```text
Original Hudl Value: TRIPS
Current Value: Trips Right
Status: Coach Edited
```

The coach can restore the original Hudl value.

Full edit history for coach-entered data is not required in V1.

---

## 15. Core Snap Schema

Core Snap fields are standardized in V1.

Coaches cannot create custom Core Snap fields.

### Core Fields

- Source / Clip #
- Quarter
- Clock
- Down
- Distance
- Yard Line / Ball Position
- Hash
- Personnel
- Formation
- Motion
- Play Type
- Play Concept
- Direction
- Yards Gained / Lost

Imported values are preferred whenever available.

Missing values can be manually entered.

Imported values remain editable.

---

## 16. Hash

Hash is a fixed select field.

Options:

- Left
- Middle
- Right

Where possible, the application may automatically derive:

- Field
- Boundary

---

## 17. Play Type

Play Type is a fixed select field.

Options:

- Run
- Pass
- RPO
- Play Action
- Screen
- Draw
- QB Run
- Special / Trick
- Other

Keep this intentionally simple in V1.

---

## 18. Direction

Direction is a fixed select field.

Options:

- Left
- Right
- Middle
- Field
- Boundary
- Strong
- Weak
- N/A

---

## 19. Motion

Motion is a select field using common football terminology.

V1 should provide common motion values rather than requiring coaches to configure the basics.

---

## 20. Formation

Formation uses a built-in terminology library containing common football formations.

Coaches may create additional formations inline while charting.

Once created, a custom formation becomes available for future use.

Custom formations may optionally contain a simple formation diagram.

---

## 21. Play Concept

Play Concept uses a built-in terminology library.

Common concepts should be provided automatically.

Examples:

- Inside Zone
- Outside Zone
- Counter
- Power
- Trap
- Duo
- Split Zone
- Mesh
- Flood
- Screen

Coaches may create additional concepts inline.

New concepts become reusable terminology.

---

## 22. Field Position

Field position must use structured football-field data rather than plain text.

Examples:

```text
OWN 35
50
OPP 22
```

This allows the application to derive field zones automatically.

### Fixed V1 Field Zones

- Backed Up
- Own Territory
- Midfield
- Plus Territory
- Red Zone
- Goal Line

Coaches cannot configure custom field-zone boundaries in V1.

---

## 23. Coaching Templates

Coaching templates follow this hierarchy:

```text
Template
    ↓
Sections
    ↓
Fields
```

Example:

```text
Defensive Line

Run Game
├── Blocking Scheme
├── Puller
├── Double Team
├── Backside Action
└── Coaching Note

Pass Game
├── Protection
├── Chip / Help
├── Launch Point
├── Rush Opportunity
└── Coaching Note
```

Sections and fields support drag-and-drop ordering.

---

## 24. Starter Coaching Templates

V1 should ship with starter templates for:

### Offense

- Quarterbacks
- Running Backs
- Wide Receivers
- Tight Ends
- Offensive Line
- Offensive Coordinator

### Defense

- Defensive Line
- Linebackers
- DB / Secondary
- Defensive Coordinator

### General

- Custom / General

These are starting points.

Every template remains fully customizable.

---

## 25. Template Field Types

V1 supports the following custom field types:

- Short Text
- Long Text
- Number
- Checkbox
- Single Select
- Multi-Select
- Rating / Grade
- Tags

System functionality such as Play Diagrams and Hudl references should not be implemented as template fields.

---

## 26. Rating / Grade

Rating / Grade uses a fixed:

1–5

scale throughout V1.

---

## 27. Select Fields

Single Select and Multi-Select fields contain template-defined options.

Coaches may add a new option inline during film study.

The newly created option becomes part of the reusable template field.

---

## 28. Required and Optional Fields

Template fields are:

Optional by default

A coach may explicitly mark individual fields:

Required

Required fields are used by the completeness warning system.

---

## 29. Study Completion

The application does not decide when a study session is finished.

The coach determines when they are finished.

When attempting to finish or close out a study session, the application may check for unfinished required fields.

Missing required fields generate warnings.

They do not block the coach from finishing.

## 30. Live Template Editing

Template changes apply immediately to:

- Current opponent workspaces
- Future opponent workspaces

Example:

The coach adds:Run Key

The new field becomes available to existing snaps using that template.

Existing data should remain intact wherever possible.

---

## 31. Template Deletion Protection

If a coach attempts to delete a template field containing existing data:

1. Warn the coach.
2. Explain that existing data uses the field.
3. Require explicit confirmation.
4. Soft-delete the field and associated data.
5. Provide Undo.

The same behavior applies when deleting an entire coaching template.

---

## 32. Play Log

The Play Log should behave like a football-specific spreadsheet.

It is the primary film-charting interface.

### Required Capabilities

- Inline cell editing
- Keyboard navigation
- Horizontal scrolling
- Vertical scrolling
- Column resizing
- Drag-to-reorder columns
- Show / hide columns
- Single-column sorting
- Search
- Multi-row selection
- Bulk editing
- Undo bulk edits
- Cell-level notes
- Row action menu
- Autosave

---

## 33. Column Visibility

Provide a Columns dropdown.

Example:

```text
Columns

[x] Clip #
[x] Down
[x] Distance
[x] Personnel
[x] Formation
[x] Motion
[x] Play Concept
[x] Direction
[x] Blocking Scheme
[ ] Puller
[ ] DL Note
```

Checked means visible.

Unchecked means hidden.

Changes apply immediately.

---

## 34. Column Reordering

Coaches can drag table headers directly to reorder columns.

No separate configuration screen should be required.

---

## 35. Column Resizing

Table columns are resizable.

The Play Log supports horizontal scrolling when the table exceeds the available screen width.

---

## 36. Sorting

Appropriate columns support:

```text
Unsorted
    ↓
Ascending
    ↓
Descending
```

Only one column can be sorted at a time.

Selecting a new sorted column clears the previous sort.

No multi-column sorting in V1.

---

## 37. Search

Provide one basic Play Log search box.

The search narrows visible rows based on matching displayed table data.

Do not build:

- Advanced search syntax
- Query builders
- Per-column filtering

## 38. Saved Play Log Views

Coaching templates may contain multiple saved Play Log views.

Example:

```text
Defensive Line

Views
├── Quick Chart
├── Run Study
├── Pass Study
└── Situational
```

A view controls:

- Visible columns
- Column order

A view does not contain:

- Saved filters
- Saved sorting

---

## 39. Persistent Spreadsheet Layout

Persist locally:

- Selected Play Log view
- Visible columns
- Column order
- Column widths

Temporary search and sorting do not need to persist.

---

## 40. Carry-Forward Fields

When manually creating another snap, designated repeated values may carry forward from the previous snap.

Useful examples:

- Personnel
- Formation
- Motion
- Template-specific repetitive values

The coach intentionally creates the next snap.

Keyboard navigation does not automatically generate new rows.

---

## 41. Bulk Editing

The coach may select multiple Play Log rows.

The coach must confirm.

Afterward, provide an immediate:

Undo

action.

Undo restores all affected values as one operation.

---

## 42. Cell-Level Notes

Individual Play Log cells may contain notes/comments.

Example:

A coach may attach a note specifically to the Blocking Scheme value rather than the entire snap.

No special spreadsheet-style visual comment indicator is required in V1.

Cell notes remain accessible when editing the cell or viewing Play Detail.

---

## 43. Row Actions

Each Play Log row contains one options button.

Actions:

- Open Play Detail
- Add Quick Note
- Mark / Resolve Must Review
- Add / Edit Play Diagram
- Duplicate Snap
- Delete Snap

Destructive actions require confirmation.

---

## 44. Duplicate Snap

Duplicate Snap copies:

- Core Snap fields
- Template-specific structured field values

It does not copy:

- Quick Notes
- Cell notes
- Must Review status
- Play Diagram

---

## 45. Play Detail

Play Detail handles information that does not fit naturally into the spreadsheet.

Display:

- Core Snap Data
- Template-specific fields
- Cell notes
- Imported / original Hudl values
- Quick Note access
- Must Review status
- Play Diagram

Routine charting should still happen primarily in the Play Log.

---

## 46. Quick Notes

Quick Notes provide lightweight observation capture.

### Default Tags

- Run
- Pass
- Formation
- Personnel
- Protection
- Player
- Situation
- Review Later

Custom tags are allowed.

---

## 47. Quick Notes Interface

Each Source Game contains a chronological Quick Notes list.

The Play Log row-options menu provides a fast popup for creating a Quick Note without leaving the spreadsheet.

Quick Notes should remain intentionally lightweight.

---

## 48. Must Review

Any snap can be marked:

Must Review

Marked snaps automatically appear in the Source Game’s Review Queue.

---

## 49. Focused Review Mode

The Must Review queue supports sequential review.

Workflow:

```text
Open Flagged Snap
    ↓
Review / Edit
    ↓
Resolve
    ↓
Automatically Advance

```text

Controls:

- Previous
- Next
- Skip
- Resolve

Resolving Must Review removes the snap from the queue.

Quick Notes do not enter the Must Review queue.

---

## 50. Fixed Keyboard Shortcuts

V1 uses a fixed keyboard shortcut system.

Do not build configurable keybindings.

Shortcuts should cover common high-speed actions such as:

- Navigation
- Save / autosave-related interactions
- Next / Previous Snap
- Must Review
- Open Play Detail
- Spreadsheet cell navigation

---

## 51. Play Designer

Revised 2026-09-15 to match the "Play Designer" design (claude.ai/design, concept 3a "Call sheet +
drawing"). The designer is a call sheet with drawing on top: pick a formation, pick each man's job
from a visible menu, then drag men and route points to what was seen on film.

- Start from: four built-in offensive formations (Gun Trips, Gun Spread, Gun Empty, Pistol Ace),
  each loaded with a base 4-3 defense.
- The coach can save the current offensive alignment as a named formation and forget it later.
- Snap-to-grid (1 yd = 10 px) toggle; the field strip shows 5-yard lines, hashes, and the line of scrimmage.
- Offense / Defense side toggle; the other side fades or can be hidden.

## 52. Player Objects

Each man carries: side, canvas position, position group (QB, WR, OL, DE, LB…), optional label
shown under the marker (e.g. `#7 Ortiz`), and an assignment (job). Offensive linemen render as
boxes, everyone else as circles. Men can be added per position group and removed.

## 53. Assignments and Drawing

Routes belong to men. Stamping a job draws its route relative to the man; clicking the field
appends a point to the selected man's route; points drag and double-click to delete. Segment
lengths read in yards. Blocking jobs end in a bar, everything else in an arrowhead.

Defense adds Zone (a draggable, resizable ellipse) and Man (click the offensive man to cover).

The legacy free-drawn shapes (arrow, curve, block, dashed, freehand) still render in existing
diagrams but are no longer authored.

---

## 54. Diagram Notes

Each diagram may contain one general Note field.

This can capture:

- Coaching cues
- Play explanation
- Blocking explanation
- Context not obvious from the drawing

No arbitrary text-placement tool is required in V1.

---

## 55. Play Diagrams

Diagrams attach to plays.

Each Source Game contains a Play Diagrams gallery.

The coach can:

- View a diagram
- Edit a diagram
- Delete a diagram
- Select a diagram for inclusion in a report

Diagrams are associated with plays and can later be reused as report content.

---

## 56. Opponent Data

Opponent Data is intentionally simple in V1.

The coach chooses:

```text
Games to Include
    ↓
Group By
    ↓
Optional Second Group By
    ↓
View Results
```

**Example**

```text
Games: All 3
Group By: Formation
Second Group By: Play Concept
```

**Example result**

| Formation | Play Concept | Snaps | Frequency | Avg. Yards |
|---|---|---|---|---|
| Trips Right | Counter | 12 | 38% | 5.4 |
| Trips Right | Inside Zone | 8 | 25% | 3.8 |
| Trips Right | Screen | 5 | 16% | 6.2 |

---

## 57. Opponent Data Grouping Fields

Opponent Data can group by appropriate Core Snap fields and template-specific structured fields.
Typical grouping fields include:

- Personnel
- Formation
- Motion
- Play Type
- Play Concept
- Direction
- Down / Distance Situation
- Field Zone
- Hash
- Blocking Scheme
- Protection
- Coverage
- Other structured template fields
V1 does not include an advanced situational filter/query builder.

---

## 58. Source Game Selection in Opponent Data

The coach can choose which Source Games are included in the analysis.
Example:
Games Included

[x] Opponent vs Team A
[x] Opponent vs Team B
[ ] Opponent vs Team C
Statistics recalculate based on the currently selected Source Games.
By default:
All Games
are selected.
V1 does not support saved game scopes.

---

## 59. Objective Statistics

Opponent Data calculates objective statistics only.
V1 statistics include:

- Snap count
- Frequency
- Percentage
- Average yards gained/lost
The application does not decide whether a play was successful.
The coach is responsible for interpreting what the data means.

---

## 60. Down and Distance Situations

Down and Distance values preferably come directly from Hudl CSV imports.
When those values are available, the application may derive useful situational groups automatically.
Examples:

- 1st Down
- 2nd & Short
- 2nd & Medium
- 2nd & Long
- 3rd & Short
- 3rd & Medium
- 3rd & Long
- 4th & Short
- 4th & Medium
- 4th & Long
The coach does not need to manually classify each snap into these groups.

---

## 61. Tendencies / Alerts

Tendencies and Alerts originate from Opponent Data.
The coach identifies a meaningful result and chooses:
Create Tendency / Alert
The application creates a snapshot of the selected result.

**Example**

```text
Formation: Trips Right
Play Concept: Counter
Snaps: 12
Frequency: 38%
Average Yards: 5.4
```

The coach then adds their football interpretation.

---

## 62. Tendency / Alert Fields

A Tendency / Alert includes:

- Title
- Category
- Statistical snapshot
- Coach explanation / coaching point
- Optional Play Diagram
- Report inclusion

**Example**

```text
Title:
Trips Counter Alert
```

Category:
Run Game

```text
Data:
Trips Right + Counter
12 snaps
38%
5.4 average yards
```

Coach Note:
Watch the backside guard. His pull gives the concept away.

---

## 63. Tendency / Alert Categories

Provide common default categories.
Examples:

- Run Game
- Pass Game
- Personnel
- Formation
- Protection
- Situational
- Player / Matchup
- Trick / Constraint
- Red Zone
Coaches can create custom categories.

---

## 64. Tendency Creation Rules

In V1, Tendencies / Alerts can only be created from Opponent Data results.
Do not support completely manual Tendencies that are disconnected from charted data.
Film observations that have not yet been supported through Opponent Data remain:

- Quick Notes
- Cell Notes
- Template-specific notes

---

## 65. Tendency Data Snapshot

A Tendency stores a snapshot of the relevant Opponent Data result.
It does not remain live-linked to changing analytics.
Example:
If the coach creates a Tendency when the data shows:

```text
Counter
12 snaps
38%
5.4 avg yards
```

and later imports another game, that Tendency does not automatically change.
The coach must deliberately create or update their conclusion.

---

## 66. Supporting Clip References

Tendencies do not need to automatically retain every underlying Hudl clip reference.
Keep the Tendency model lightweight in V1.
Individual selected plays and report content may still contain clip references where useful.

---

## 67. Reports

Each Weekly Opponent Workspace contains a Reports area.
The report system is designed to turn accumulated film-study work into a comprehensive document that can be printed or exported.
Reports may span multiple pages.
There is no artificial page limit.

---

## 68. Report Types

V1 supports two report intents:
Comprehensive Coach Report
Used for detailed staff or personal game-plan preparation.
Player Report
Used for distributing selected information to players.
Both use the same underlying Report Builder.

---

## 69. Comprehensive Coach Report

The Coach Report may include:

- Opponent Data
- Tendencies / Alerts
- Coaching explanations
- Selected plays
- Hudl clip references
- Play Diagrams
- Quick Notes
- Position-specific analysis
- Game-plan information
- Matchup information
- Situational information
The report may be as detailed as the coach wants.

---

## 70. Player Report Workflow

The Player Report starts from the Coach Report.

**Workflow**

```text
Comprehensive Coach Report
    ↓
Duplicate as Player Report
    ↓
Remove Unnecessary Information
    ↓
Reorder / Simplify
    ↓
Export PDF
```

The duplicated Player Report becomes independent.
Changes to the Player Report must not modify the original Coach Report.

---

## 71. Report Snapshot Behavior

Report content is snapshot-based.
When a coach adds:

- Opponent Data
- A Tendency
- A Quick Note
- A selected play
- A diagram
the report stores that version of the content.
Later changes to the source data do not automatically alter the report.
This prevents an already-prepared game plan from changing unexpectedly.

---

## 72. Report Builder

The Report Builder uses fixed content blocks.
V1 content blocks:

- Heading
- Text / Coach Notes
- Opponent Data Table
- Tendency / Alert
- Play Diagram
- Selected Plays
- Quick Notes
The coach can add and reorder these blocks.

---

## 73. Heading Block

A Heading block contains a coach-defined heading.

**Examples**

```text
Run Game
3rd Down Alerts
Most Common Formations
Defensive Line Keys
```

---

## 74. Text / Coach Notes Block

A Text block contains free-form written explanation.
Examples:
Their offense is built around Counter and Inside Zone.
The backside guard is our primary run key this week.
This allows the report to include context that cannot be represented by structured statistics.

---

## 75. Opponent Data Table Block

The coach can take an Opponent Data result and add it to the report.
Example:
Most Common Formations

| Formation | Snaps | Frequency | Avg. Yards |
|---|---|---|---|
| Trips Right | 34 | 41% | 5.2 |
| Doubles | 21 | 25% | 4.3 |
| Pro I | 12 | 14% | 3.8 |

The report receives a snapshot of the table.

---

## 76. Tendency / Alert Block

A Tendency block renders the coach’s saved Tendency.

**Example**

```text
Counter Alert
Formation: Trips Right
Frequency: 38%
Average Yards: 5.4
```

Coaching Point: Watch the backside guard. His pull gives the concept away.
Optional associated Play Diagram may appear with the block.

---

## 77. Play Diagram Block

The coach can select a Play Diagram created during film study and insert it into a report.
This supports sections such as:

Most Common Formations

or:

Primary Counter Look

followed by a representative diagram.

---

## 78. Selected Plays Block

The coach can choose individual Play Log snaps to include in a report.
Displayed information can include appropriate fields such as:

- Clip #
- Down
- Distance
- Formation
- Play Concept
- Direction
- Yards
- Coaching fields
- Notes
The exact fields shown should follow the report context rather than automatically dumping every snap field.

---

## 79. Quick Notes Block

Selected Quick Notes can be added to reports.
Example:

- LG's stance gets heavy before he pulls.
- TE aligns tighter when they run split zone.
- Tempo increases after explosive plays.
The coach controls which Quick Notes appear.

---

## 80. Report Block Ordering

Report blocks support drag-and-drop ordering.
Example:

1. Opponent Overview
2. Top Formations
3. Run Game
4. Counter Alert
5. Counter Diagram
6. Pass Game
7. Protection Tendencies
8. Situational Alerts
9. Final Player Keys
The layout should support naturally flowing multi-page documents.

---

## 81. Report Clip References

Reports may include source/Hudl clip references.
This is particularly useful in the Comprehensive Coach Report.

**Example**

```text
Counter Alert
Relevant Clip: 47
```

The Player Report can hide clip references for cleaner presentation.

---

## 82. PDF Export

Both Coach Reports and Player Reports export as PDFs.
V1 PDF priorities:

- Readability
- Clean page breaks
- Clear headings
- Compact football information
- Tables
- Diagrams
- Notes
- Consistent spacing
- Printable formatting
Do not build advanced visual design functionality.

---

## 83. Report Styling

V1 does not require:

- Custom branding systems
- Custom font systems
- Team logos
- Custom page backgrounds
- Theme editors
- Graphic design controls
- Marketing-style layouts
The goal is a functional coaching document.

---

## 84. Archive System

Finished Weekly Opponent Workspaces can be archived.
Archiving:

- Removes the workspace from Current Opponents
- Preserves all study data
- Keeps the workspace associated with its season
- Allows the workspace to be opened later
- Can be reversed
Archive is not deletion.

---

## 85. Archived Opponents

Provide an Archived Opponents area organized by season.

**Example**

```text
2026
├── Week 1 — Spanish Fork
├── Week 2 — Springville
└── Week 3 — Provo
```

```text
2025
├── Week 1 — Payson
└── Week 2 — Maple Mountain
```

Do not build a custom folder-management system.

---

## 86. Soft Deletion

Major user-created data uses a 24-hour soft-delete system.
Soft deletion applies to:

- Weekly Opponent Workspaces
- Source Games
- Snaps
- Coaching Templates
- Template Fields
- Tendencies / Alerts
- Play Diagrams
- Reports
When deleted:

1. The record is removed from the normal interface.
2. It remains recoverable for 24 hours.
3. The coach receives an Undo option.
4. After 24 hours, it becomes eligible for permanent deletion.

---

## 87. Parent / Child Deletion

Deleting a parent record soft-deletes its dependent data as one recoverable unit.

**Example**

```text
Delete Source Game
    ↓
Soft Delete:
    ├── Snaps
    ├── Quick Notes
    ├── Must Review Flags
    ├── Cell Notes
    ├── Template Analysis
    └── Play Diagrams
```

Undo restores the entire hierarchy.
The same rule applies to deleting a Weekly Opponent Workspace.

---

## 88. Undo

Undo is required for destructive and large-scale operations.
At minimum:

- Bulk edits
- Template deletion
- Template-field deletion
- Snap deletion
- Source-game deletion
- Workspace deletion
- Tendency deletion
- Diagram deletion
- Report deletion
For soft-deleted records, Undo remains possible during the 24-hour recovery period.

---

## 89. Autosave

Autosave must apply across the application.
Examples:

- Play Log cell edits
- Template fields
- Quick Notes
- Play Diagrams
- Tendency content
- Report edits
- Column layouts
- Workspace metadata
Routine work should never require a manual Save button.

---

## 90. Local Persistence

All data must persist locally between application launches.
At minimum:

- Seasons
- Opponent Workspaces
- Source Games
- Snaps
- Hudl mappings
- Imported source values
- Templates
- Template fields
- Template options
- Play Log layouts
- Quick Notes
- Must Review
- Cell Notes
- Play Diagrams
- Opponent Data-related saved Tendencies
- Reports
- Archived Workspaces
- Soft-delete metadata

---

## 91. No Authentication

V1 does not require:

- Sign up
- Sign in
- Passwords
- Email verification
- User profiles
- Team invitations
- Role permissions
Launching the application opens directly into the local coaching notebook.

---

## 92. No Cloud Sync

V1 installations are independent.
Do not implement:

- Automatic device synchronization
- Cloud workspace synchronization
- Shared accounts
- Web-based backup
- Cross-device continuation
A coach’s local machine owns the V1 data.

---

## 93. No Backup / Restore

Explicit application-level Backup and Restore functionality is deferred until after V1.
This includes:

- Full database export
- Full database import
- Cloud backup
- Migration between computers

---

## 94. No Video Playback

The application is a companion to Hudl, not a replacement.
Do not implement:

- Video file imports
- Video streaming
- Embedded Hudl playback
- Timestamp synchronization
- Frame stepping
- Clip downloading
- Video storage
Coaches continue watching film through:

- Hudl desktop/browser
- Hudl mobile
- Phone
- Tablet
- Existing film workflow

---

## 95. Hudl Reference

The connection between this application and film is the source/Hudl reference stored with each snap.
Possible imported identifiers include:

- Clip #
- Play #
- Quarter
- Clock
- Other CSV identifiers
The coach can use these values to locate the play in Hudl.

---

## 96. Terminology Library

V1 ships with common football terminology so coaches do not have to configure basic vocabulary.
Terminology areas include:

- Formations
- Motions
- Play concepts
- Directions
- Play types
- Position-specific starter-template terminology
Coaches may create appropriate custom terminology inline where supported.
Do not build a terminology alias system in V1.
If two values are different, the application treats them as different values.

---

## 97. Personnel

Personnel remains a basic Core Snap field in V1.
Do not build advanced custom package management.
Advanced concepts such as:

- Jumbo packages
- Named personnel packages
- Personnel aliases
- Specialized package builders
can be added later.

---

## 98. Manual Snap Creation

Although Hudl CSV is preferred, coaches must be able to create snaps manually.
Manual creation should expose the standardized Core Snap fields.
Template-specific fields become available through the selected Source Game coaching template.
Manual creation remains explicit.
The application does not automatically create a new snap whenever the coach presses Enter.

---

## 99. Source Game Template Rule

Every Source Game uses exactly one coaching template.

**Example**

```text
Opponent vs Team A
→ Defensive Line Template
```

A second template cannot simultaneously analyze the same Source Game in V1.
This keeps the application data model and film-study workflow simpler.

---

## 100. Changing a Source Game Template

The coach selects the Source Game’s coaching template when creating/importing the game.
If no template-specific study data exists, changing the template can be straightforward.
If template-specific data already exists:

1. Warn the coach.
2. Explain that existing template analysis will be removed.
3. Require confirmation.
4. Soft-delete the previous template-specific data.
5. Allow Undo for 24 hours.
Core Snap Data remains intact.

---

## 101. Shared Core Snap Data

Core Snap Data is independent from the coaching template.

**Conceptually**

```text
Snap
├── Core Snap Data
└── Template Analysis Data
Example:
Snap #42
```

```text
Core
├── Down: 2
├── Distance: 6
├── Formation: Trips Right
├── Play Concept: Counter
└── Yards: 7
```

```text
Defensive Line Analysis
├── Blocking Scheme: GT Counter
├── Puller: LG
├── Double Team: Yes
└── Coaching Note: Wrong-arm the kickout
```

---

## 102. Template Initialization

When a Source Game is assigned a coaching template, every snap can receive that template’s analysis structure.
The fields begin blank until the coach enters analysis.
Core Snap Data is never duplicated.

---

## 103. Completeness Warnings

Most fields are optional.
Only fields explicitly marked Required participate in completeness checks.
When the coach finishes a study session or attempts to close it out, the application may warn:
7 snaps contain unfinished required fields.
The coach may still continue.
The warning is informational, not blocking.

---

## 104. No Game Summary Analytics

Do not create a separate Game Summary analytics system in V1.
Source Games are primarily study workspaces.
Statistical analysis across games belongs in Opponent Data.
This avoids duplicating analytics features.

---

## 105. Source Game Quick Notes

Quick Notes remain scoped to the Source Game where they were created.
They are not automatically promoted into Weekly Opponent information.
The coach decides what information becomes part of:

- Opponent Data conclusions
- Tendencies / Alerts
- Reports

---

## 106. Cross-Game Analysis

Opponent Data can aggregate multiple Source Games from the Weekly Opponent Workspace.
Example:
Opponent: Salem Hills

```text
Included:
[x] vs Provo
[x] vs Payson
[x] vs Springville
```

This allows the coach to identify patterns across several film-study sessions.
The coach may temporarily exclude individual games when analyzing the opponent.

---

## 107. Coach-Controlled Interpretation

The application must avoid pretending to understand football conclusions for the coach.
The software’s job is to:

- Store structured observations
- Organize information
- Count occurrences
- Calculate percentages
- Calculate average yards
- Present grouped data
- Preserve notes
- Help construct reports
The coach’s job is to decide:

- What matters
- What is a tendency
- What players need to know
- What needs practice
- What should affect the game plan

---

## 108. V1 Navigation Model

A simple conceptual application hierarchy:

```text
App
├── Home
│   ├── Current Season
│   ├── Current Opponents
│   ├── Archived Opponents
│   ├── Coaching Templates
│   └── Settings
│
└── Season
    └── Weekly Opponent Workspace
        ├── Overview
        ├── Source Games
        │   └── Source Game
        │       ├── Play Log
        │       ├── Quick Notes
        │       ├── Must Review
        │       └── Play Diagrams
        │
        ├── Opponent Data
        ├── Tendencies / Alerts
        └── Reports
```

---

## 109. Recommended V1 Desktop Layout

The application should be optimized for desktop use.
Primary assumptions:

- Coaches commonly have Hudl open beside the application.
- Horizontal space is valuable.
- The Play Log may contain many columns.
- Tables should prioritize information density over large mobile-style controls.
- Navigation should consume minimal screen space.
- Common film-study actions should remain quickly accessible.
The app does not need to be designed as a mobile application in V1.

---

## 110. Recommended Primary Screens

V1 requires the following primary screens:

1. First Launch Setup
2. Home
3. Season View
4. Create Opponent
5. Weekly Opponent Overview
6. Source Games List
7. Add Source Game
8. Hudl CSV Import / Mapping
9. Hudl Import Preview
10. Play Log
11. Play Detail
12. Quick Notes
13. Must Review Queue
14. Play Diagram Gallery
15. Play Designer
16. Opponent Data
17. Tendencies / Alerts
18. Report List
19. Report Builder
20. Report Preview
21. Coaching Templates
22. Template Builder
23. Settings
24. Archived Opponents

---

## 111. Primary User Journey

A typical week should look like this:

```text
Coach opens app
    ↓
Creates/selects current season
    ↓
Creates weekly opponent
    ↓
Adds first source game
    ↓
Selects Defensive Line template
    ↓
Imports Hudl CSV
    ↓
Confirms column mappings
    ↓
Removes irrelevant rows if needed
    ↓
Opens Play Log
    ↓
Charts film
    ↓
Adds notes / Must Review / diagrams
    ↓
Reviews flagged plays
    ↓
Adds second and third source games
    ↓
Repeats charting
    ↓
Opens Opponent Data
    ↓
Groups data by relevant fields
    ↓
Identifies meaningful patterns
    ↓
Creates Tendencies / Alerts
    ↓
Builds Comprehensive Coach Report
    ↓
Duplicates into Player Report
    ↓
Removes unnecessary coaching information
    ↓
Exports PDF
    ↓
Archives opponent after the week
```

---

## 112. Core Product Principle

Every major feature should support one of four jobs:

1. Capture film information quickly
2. Structure observations consistently
3. Find patterns across multiple games
4. Turn those patterns into usable game-plan material
If a feature does not materially improve one of those four jobs, it should generally remain outside V1.

---

## 113. V1 Success Criteria

The V1 is successful if an individual high school football coach can:

- Install and open the application without creating an account.
- Select their coaching position and receive a useful starter template.
- Create a season.
- Create a Weekly Opponent Workspace.
- Add multiple Source Games.
- Import Hudl CSV files.
- Map Hudl fields reliably.
- Chart an entire game primarily through a spreadsheet interface.
- Add position-specific information through reusable templates.
- Quickly record observations.
- Flag unresolved plays.
- Draw simple football diagrams.
- Study two or three games without recreating their setup.
- Aggregate opponent data across those games.
- Identify useful tendencies themselves.
- Turn those tendencies into structured game-plan information.
- Build a comprehensive multi-page Coach Report.
- Produce a simplified Player Report.
- Export both reports as printable PDFs.
- Archive the opponent when the week is complete.

---

## 114. Post-V1 Backlog

The following features should be explicitly deferred.
Collaboration

- Shared opponent workspaces
- Multiple coaches contributing notes
- Position-group collaboration
- Coordinator aggregation
- Comments between coaches
- Shared Tendencies / Alerts
Accounts and Cloud

- Authentication
- User accounts
- Cloud synchronization
- Multi-device support
- Team organizations
- Permissions
- Cloud backup
Hudl Integration

- Direct Hudl API integration
- Automatic film synchronization
- Opening Hudl clips directly
- Video playback
- Embedded video
- Automated clip collections
Advanced Analytics

- Situational query builder
- Saved tendency queries
- Saved game scopes
- Advanced filtering
- Multi-column filtering
- Multi-column sorting
- Automatic tendency detection
- AI-generated opponent analysis
- Statistical significance
- Trend comparisons between games
Play Designer

- Formation presets
- Reusable diagrams
- Saved play libraries
- Formation auto-layout
- Animation
- Advanced annotation tools
- Custom line styles
- Shared diagram libraries
Reports

- Reusable report templates
- Team branding
- Logos
- Custom themes
- Advanced page design
- Collaborative reports
- Live-linked report data
- Web sharing
Data Management

- Backup / Restore
- Database export
- Database import
- Cloud storage
- Cross-computer migration
- Long-term revision history
Terminology

- Aliases
- Terminology normalization
- Shared program terminology
- Personnel package builders
- Advanced custom football taxonomies

---

## 115. Final V1 Definition

The V1 product can be summarized as:
A local-first desktop companion for high school football coaches that converts Hudl film-study data and coaching observations into reusable, structured opponent notebooks. Coaches import or manually chart snaps in a spreadsheet-style Play Log, apply customizable position-specific coaching templates, capture notes and diagrams, review flagged plays, aggregate objective statistics across multiple opponent games, convert meaningful data into Tendencies / Alerts, and build comprehensive Coach and Player reports for PDF export.
The product should feel less like a football analytics platform and more like a highly structured, reusable digital coaching notebook.
