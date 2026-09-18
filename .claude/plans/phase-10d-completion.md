# Phase 10D — Generated Report Structure — completion report

Implemented and committed in small steps on `main`; nothing pushed. **Content acceptance is
partial:** the first two live samples exposed unsupported Identity wording. The prompt was
tightened after each finding, but the final correction has not been sampled because all three
permitted paid calls were used. The real Workspace has 18 Snaps, so the ≥200-Snap acceptance
case remains unverified. No failed check is counted as a pass.

The owner-supplied plan and the earlier personnel-options change remain uncommitted and outside
these commits. No dependencies, test files, test entries or package scripts were added.

## Per-step changes and evidence

| Step | Commit | Changes and verification |
| --- | --- | --- |
| 10D.1 | `96fc227` | Added Page Break through schema, source builder, labels, insertion, rendering and print CSS. Preview suppresses leading/trailing/consecutive breaks after removing empty text. Typecheck/sync, Electron insertion, keyboard reorder, delete/Undo and two-page PDF passed. |
| 10D.2 | `aac3ee7` | Added optional table filter and preloaded scope; unchanged public aggregate args and stored table shape. Trips-filtered table matched 18 Snaps and 100% frequency; unfiltered table and brief were deep-equal to baseline. Typecheck/sync passed. |
| 10D.3 | `0559a94` | Added pure Coach/Player budgets and qualifying Formation breakdowns. Three fixture Formations qualified; all breakdown counts matched. Brief grew from 6,167 to 10,815 bytes (1.75×), so the eight-row cap stayed. Typecheck/sync and budget checks passed. |
| 10D.4 | `88048a3` | Added structured summary/section validator, recursive JSON Schema, caps, labels and grounded-content prompt. Typecheck and recursive required/optional/additionalProperties checks passed. |
| 10D.5 | `ca383cf` | Replaced flat materialization with fixed summary, Page Break, ordered groups, Counter slots and budget enforcement. Updated dependent action parsing in the same commit. Three deterministic plans passed: 33/33/18 Blocks, skips 0/0/13; those Reports were removed. |
| 10D.6 | `0e73c79` | Added request budget and tightened missing-information prose after live audit. Build/sync and mocked action checks passed. First paid call returned 51 Blocks with zero skips; content grounding findings are below. |
| 10D.7 | `8aadc21` | Changed the existing default constant to Game Plan and Tendencies. Typecheck and Electron dialog check passed; no dialog component change was needed. |
| 10D.8 | `d09872a` | Updated glossary, SPEC, BLUEPRINT and TASKS. Product labels and diff whitespace check passed. |
| Verification correction | `665d645` | Maximum-length summary initially overflowed onto page 2. Added compact print-only spacing/type for the recognized summary sequence. Repeated maximum-size PDF fits page 1, with Tendency Report on page 2; ordinary Blocks retain existing styles. Build passed. |
| Verification correction | `a73c175` | Player sample inferred “three main looks.” Added an explicit ban on inferred counts/rankings. Build/sync and mocked protocol checks passed; no fourth live call made. |
| 10D.9 | This documentation commit | Recorded final verification, usage, grounding audit and cleanup. Overall acceptance remains partial for the stated content/scale gaps. |

## Verification results

- `npm run typecheck`: passed after each implementation step.
- `npx convex dev --once`: passed for backend changes and final prompt; development deployment
  updated without migrations or real-data edits.
- `npm run build`: passed after the final code changes, including all **15 existing tests** and
  Electron/Vite builds.
- `git diff --check`: passed. Renderer bundle search found no `ANTHROPIC_API_KEY`, model ID or
  Anthropic API endpoint.
- Recursive JSON Schema check verified every object has `additionalProperties: false`, every
  required list exactly matches non-optional validator fields, and numbers/arrays/unions map
  correctly. Schema captured at `/tmp/p10d-schema.json`.
- Temporary action harness verified the unchanged model, 16,000-token limit, adaptive thinking,
  high effort, JSON-in-prompt request, budget, friendly shape errors, missing-key error,
  refusal/token-limit behavior, redaction, result propagation and no retries. These are mocked
  protocol checks, not additional paid calls.

### Deterministic backend

Fixture: 40 Snaps across Trips (18), Doubles (12), Ace (9) and Empty (1), with varied Down,
Distance, Yard Line, Direction, Hash, Play Type and Personnel. Three Tendencies (one with a
Coaching Point), two Quick Notes and one Play Diagram were created through existing mutations.
The Diagram is an empty saved field, sufficient for insertion/rendering checks.

1. Formation minimum was three Snaps. Empty was omitted; every retained breakdown totaled its
   Formation's count. Coach/Player budget thresholds and halving were checked directly.
2. Full plan: two Evidence, two Split and three Formation sections, submitted out of group order.
   Result: 33 Blocks, no skips, correct summary and group order, exact saved alert titles and
   categories, filtered table counts 18/12/9, and no redundant Counter after the noted Tendency.
3. Empty-prose plan: 33 Blocks, no skips, all four labeled blank-slot forms present.
4. Overflow/invalid plan: twelve Formation sections against a cap of three, six descriptors in
   one section, one bad Tendency ID and one missing filter. Result: 18 Blocks and exactly 13
   skips (nine excess sections, two excess descriptors, one bad ID, one missing-filter section).
   No empty section/group headings survived. All three Reports were soft-deleted.
5. Invalid identity table plus no usable sections, unknown Formation value and changed included
   Source Game IDs failed without inserting a Report. Player materialization halved Formation
   caps, rejected Selected Plays and stored `showClipReferences: false`.
6. Filtered tables in all three live Reports were compared with real Snap counts by Formation;
   saved Key Alerts matched source titles/categories exactly. The real Workspace had no
   supporting prose, and its Identity, Priorities, Key Alerts and Counters stayed blank.
7. Seven original Block types were inserted through Electron dialogs. Snapshots rendered and
   survived reload. Duplicate as Player Report copied all Blocks, hid clip references and stayed
   independent when its Heading was edited. One-/two-field aggregates still totaled 40 Snaps.

### Electron and PDF

Real Electron ran via `npm run dev -- --remote-debugging-port=9340 --inspect=9342`.
Checks covered insertion, Move up/Move down via keyboard, delete/Undo, light/dark themes,
Preview divider, all seven original insertion dialogs, one-/two-field Opponent Data, Player
Preview, and opening a pre-change Report in Builder and Preview. Default-name check passed.

PDFs were exported through the **existing** `window.filmStudy.exportReportPdf` bridge. A
throwaway inspector harness temporarily returned a `/tmp` path from the native save dialog,
then restored that function; PDF generation itself used the unchanged Electron implementation.
No PDF bridge code was edited.

| PDF | Pages | Opening |
| --- | --- | --- |
| Coach fixture | 7 | Game-Plan Summary on page 1; Tendency Report at top of page 2 |
| Player fixture | 5 | Same structure; no Selected Plays or clip references |
| Real Workspace (18 Snaps) | 8 | Blank prose slots; same page-1/page-2 transition |
| Page Break boundaries | 2 | Two Text Blocks separated correctly despite leading, trailing and repeated breaks |
| Maximum-size summary | Summary stays on 1 page | 600-character Identity, five 160-character priorities, five long alerts, six table rows; body begins page 2 |

The maximum-size check uses DOM-only replacement, not saved notebook data. Before the print
correction, Key Alerts spilled onto page 2 and the body started on page 3. After correction,
text extraction and visual inspection confirmed the intended transition. Printed summary uses
12px text, tighter row padding/spacing and 18px heading; screen Preview keeps existing sizing.
The summary is recognized by its opening Heading and the Tendency Report Heading immediately
after the first Page Break. Renaming/reordering those Blocks removes this special treatment.
Manual editing can still exceed generated-content caps, consistent with the editable Builder.

Poppler verified page counts, extracted text and rendered sample pages for visual inspection.
`mdls -name kMDItemNumberOfPages` did not resolve these temporary PDFs, so `pdfinfo` and page
text boundaries supplied the counts. Files: `/tmp/p10d-live-{coach,player,real}.pdf`,
`/tmp/p10d-break.pdf`, `/tmp/p10d-max-summary.pdf`. This proves the measured documents, not a
universal 5–12-page guarantee or ≥200-Snap performance.

Temporary harness issues were corrected and rerun: fixture yard-line spelling, unsupported
renderer `Page.printToPDF`, main-inspector module access, the Opponent Data route, and an atomic
list comparison made concurrently with a live fixture Report insertion. None was treated as a
product pass until corrected. The initial unsupported print command was replaced by the real
PDF bridge described above.

## Live calls and cost evidence

Exactly **three** paid requests, all HTTP 200 with `stop_reason: end_turn`, no automatic retries,
no token-limit stops, no streaming mitigation and no changes to model/thinking/effort.

| Call | Scope / intent | Input tokens | Output tokens (thinking included) | API latency | Through materialization | Blocks / skipped |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Fixture / Coach, Defensive Line | 8,577 | 4,891 (2,558 thinking) | 52.8 s | 53.9 s | 51 / 0 |
| 2 | Fixture / Player, Defensive Line | 8,668 | 3,139 (1,822 thinking) | 36.2 s | 37.6 s | 34 / 0 |
| 3 | Real Workspace / Coach, Defensive Line | 10,031 | 2,577 (1,281 thinking) | 25.3 s | 26.8 s | 45 / 0 |

All cache token counts were zero. Monetary cost was not calculated.

To capture usage without adding a production logger, `/tmp/p10d-live.cjs` bundled the actual
action and invoked its handler locally. Its query context used the deployed internal brief;
its mutation context invoked deployed `aiReports:createGenerated` with the actual returned
plan. Fetch observation recorded usage/stop reason/latency, not credentials. The deployment key
was read directly into process memory and never printed or written. This verifies real Claude
requests and deployed materialization, but does not measure hosted-action runtime overhead or
exercise a paid Generate-button click. The harness enforced a persisted three-request ceiling.

## Grounding audit

Call 1 Identity, sentence by sentence:

| Generated wording | Recorded source / finding |
| --- | --- |
| “Coach-recorded looks for this opponent are the Trips look, the Doubles look and the Ace look, all logged in the run game.” | The three look names match saved Tendency titles. “Run game” came from categories, which D1 does not authorize as Identity prose: partial failure. |
| “The recorded Trips note is to watch the inside alignment, and a Quick Note reminds us to check the back before the Snap.” | Trips Coaching Point and Quick Notes: “Watch the inside alignment.” / “Check the back before the Snap.” Grounded. |
| “Nothing else is recorded about how they want to play: Blocking Scheme, Double Team, Backside Action, Protection, Chip / Help, Launch Point, Rush Opportunity and Motion are uncharted on this tape, so front-specific judgments are not available.” | Inferred from grouping previews, not a recorded note/title: failure. |

Call 1 priorities:

| Priority | Recorded source |
| --- | --- |
| “Trips look: watch the inside alignment.” | Trips Tendency title + its Coaching Point |
| “Doubles look.” | Doubles Tendency title |
| “Ace look.” | Ace Tendency title |
| “Check the back before the Snap.” | Quick Note with that exact sentence |

All eleven model Counter strings in call 1 were blank. Ten printed blank slots; the Trips
Evidence Counter was omitted because its Tendency already printed the Coaching Point.

After call 1, the prompt explicitly prohibited missing-field/completeness commentary and
category-derived Identity. Call 2 restated recorded alignment/back notes and used those same
recorded sentences for its non-empty Counter strings. However, “They show three main looks”
adds a count/ranking not recorded by the coach (and the fixture contains a fourth thin
Formation). It is not counted as a grounding pass. The final prompt now explicitly prohibits
inferred counts/rankings. No fourth call was made to verify that final wording.

Call 3 left every prose slot blank, consistent with its available notes. Key Alerts always
came from saved titles/categories server-side. Snapshot statistics never came from model
prose. The remaining risk is **prompt-only semantic grounding**: validators/caps can enforce
structure and references, but cannot prove a paraphrase is faithful. AC6 and the related
no-statistics prose acceptance remain partial until a clean final-prompt sample is reviewed.

## Decisions, assumptions and deviations

- Owner decisions were retained: fixed structure for all Coaching Areas; coach-recorded prose
  or blanks; Page Break is a normal Block; inline Our counter: slots; noted Evidence exception.
- Filtering is server-only, additive and uses the existing grouping matcher. Unknown/self-group
  filters are rejected. Generated Formation filters must select a qualifying supplied Formation.
- One scope is passed through brief/materializer/table calls; Selected Plays also reuses its
  loaded Snaps. No cache, new persistence model or report migration was added.
- Budget counts, per-section descriptors and text are capped server-side. Skips count excess
  sections, excess descriptors and invalid references; partial invalid Quick Note lists retain
  the valid IDs as before. Semantic duplicate avoidance remains a model instruction.
- Action shape parsing moved from step 6 into step 5 because its mutation argument type changes
  with the structured validator. This kept each committed step type-correct. The request budget
  and live checks remained in step 6. Step 4's legacy array validator was removed in step 5.
- The two final code commits address failures discovered during step 9, without adding new
  features: compact printed summary and stricter grounded wording.
- No permanent tests or scripts were added, per the approved plan. Temporary runnable checks
  remain in `/tmp/p10d-check.mjs`, `/tmp/p10d-action-check.cjs`, `/tmp/p10d-live.cjs`,
  `/tmp/p10d-pdf.mjs` and the associated UI harnesses. They are not repository assets.
- Live error handling with an absent deployment key was checked by the mocked action; the real
  deployment key was present and was not removed for testing.

## Cleanup and preservation

- Fixture Season: `k17cq3v8bqcas2hgkj67pxzt958enph6`.
- Fixture Workspace: `kx757x0nnjd1dv37kaz4x1ze498emvyw`.
- Three deterministic Reports and one Player guard Report were removed during their checks.
- Final cleanup removed five remaining fixture Reports, then soft-deleted the fixture Season
  and descendants. Follow-up reads showed no live fixture Workspace, Season or Reports.
- Real verification Report `jx74htxk8akx7fzrcprdh1sts98enw63` was soft-deleted after inspection.
  It was a verification artifact, not retained as an approved game plan.
- Real Source Game `k97b7a9kqaxfs1fhxzdx0tvtcx8ecycv`: **18 Snaps before and after**, deep-equal.
  Both pre-existing Reports, including content and timestamps, were deep-equal to baseline.
- No existing real notebook record, settings or inclusion state was changed. Evidence is in
  `/tmp/p10d-cleanup.json`, `/tmp/p10d-ids.json` and `/tmp/p10d-live-calls.json`.

## Remaining acceptance work

1. Review a new final-prompt sample for every Identity, Priority and Counter sentence before
   calling grounding fully accepted. This session used the full three-call allowance.
2. Verify the intended ≥200-Snap Workspace scale and 5–12-page target; only the actual 18-Snap
   real Workspace and 40-Snap fixture were available here.
3. A paid hosted-action/Generate-button walkthrough was not repeated; live requests used the
   actual local action handler and deployed brief/materializer to capture usage without logging
   changes. UI controls, error protocol and deployed synchronization were checked separately.
