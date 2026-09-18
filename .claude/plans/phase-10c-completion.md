# Phase 10C — AI Report Generation — completion report

Implementation is committed on `main`. **Live generation acceptance is incomplete:** the
configured Convex deployment has no `ANTHROPIC_API_KEY`. No real Claude calls were made, no
key was invented or stored locally, and coach-type differentiation, Player prose, generation
latency and paid cost remain unverified. The supplied plan is unchanged and uncommitted.

## Per-step changes and evidence

| Step | Commit | Changes and verification |
| --- | --- | --- |
| 10C.0 | `15f0dc2` | Added `@anthropic-ai/sdk` 0.126.0 and lockfile; README documents deployment-only key, network requirement, paid calls, third-party scouting brief transmission and missing-key behavior. Typecheck passed. Deployment key absent. |
| 10C.1 | `fa6d6f3` | Extracted the seven-case `buildBlock`, named source validator, and exported existing name/size checks. Manual insertion still validates and snapshots through the same code. Typecheck/sync and seven-type fixture mutation checks passed; all types rendered in Electron. |
| 10C.2 | `1757df7` | Added capped Workspace brief using existing queries and `computeResult`, domain limits and eleven-Coaching-Area prompt. Live brief returned eight Snaps as counts, two Quick Notes, a Tendency and a Play Diagram; no Snap dump. |
| 10C.3 | `1e880f0` | Added atomic materialization and the dependent Node action, derived structured-output schema, source/reference validation, partial-block skipping and included-game race guard. SDK types and Convex bundling passed. Live fixture materialization and missing-key behavior passed; paid path remains unverified. |
| 10C.4 | `0102f4f` | Added Generate with AI dialog and list wiring using existing controls. Defaults, labels, keyboard traversal, both themes, pending status/disabled controls/Escape lock and retained inputs on error passed in real Electron. |
| 10C.5 | `fb108d4` | Added Generated Report glossary entry, BLUEPRINT modules/behavior, and Phase 10C checklist before Phase 11. Non-Terms and schema unchanged. |
| 10C.6 | `0a94250` | Recorded live fixture backend and temporary mocked-action checks. Paid Coach Report generation and regeneration remain blocked by missing key. |
| 10C.7 | `8a2ed0d` | Recorded Electron and Player intent checks. Actual Defensive Line versus Quarterbacks content and Player prose remain unverified. |
| 10C.8 | This documentation commit | Build and production Electron launch passed; fixture cleanup and unchanged real data confirmed. This report records gaps without marking live generation complete. |

## Verification results

- `npm run typecheck`: passed after backend and UI integration and as part of the final build.
- `npx convex dev --once`: passed; internal brief/mutation and Node action deployed to the
  existing development deployment. No schema or real notebook data migration.
- `npm run build`: passed strict TypeScript, all **15 existing tests**, and Electron/Vite builds.
- `git diff --check`: passed. No new persistent test files, test entries or package scripts.
- Renderer bundle search found no `ANTHROPIC_API_KEY`, Claude model ID or Anthropic API endpoint.
- Temporary checks remain outside the repository in `/tmp/p10c-check.mjs`,
  `/tmp/p10c-action-check.cjs`, `/tmp/p10c-ui.mjs`, `/tmp/p10c-report-ui.mjs`, and
  `/tmp/p10c-built-check.mjs`. Backend modes: `seed`, `brief`, `materialize`, `guards`,
  `backend`, `cleanup`; `key` printed only presence/absence, never a secret.

### Backend fixtures

Created a separate Season, Workspace and Source Game, with eight manually specified Snaps
through the existing create mutation: five Trips / Inside Zone and three Doubles / Mesh,
varied Down and yards. Added one Tendency / Alert, one Play Diagram and two Quick Notes.
Fixture setup used API mutations rather than charting eight Snaps through the UI.

1. All seven manual insertion types passed after extraction and rendered in the Report Builder.
2. All seven generated descriptor types materialized successfully. Single-field and two-field
   data tables matched `opponentData.aggregate` exactly; saved Tendency rows were deep-equal.
   Electron displayed Trips: 5 Snaps, 63%, 0.0 average yards; Doubles: 3 Snaps, 38%, 4.0 average.
3. Three valid Blocks plus an invalid Tendency ID produced three Blocks and `skipped: 1`.
4. Mixed valid/invalid/duplicate Quick Note IDs retained the two eligible notes. Selected Plays
   used the existing grouping matcher, ordered real Snaps, and produced the expected five rows.
5. Heading/Text were truncated at 120/10,000 characters. Player intent stored
   `showClipReferences: false` and hid the clip column in Electron.
6. Empty plans, all-invalid plans, malformed descriptor types and 25-Block plans left the Report
   list unchanged. Included Source Game changes also rejected atomically.
7. A second Source Game with a distinct Formation, diagram and note was excluded. It disappeared
   from aggregates, Quick Notes, diagrams and linked Player Notes. A saved Tendency spanning
   both games was omitted; its existing Statistical Snapshot was never rewritten. A generated
   plan referencing the excluded content retained only its Heading and included-data table.
8. A Tendency with `includeInReport: false` was skipped. Duplicate Source Game labels caused
   Selected Plays to skip instead of choosing an arbitrary game.
9. An empty fixture Workspace returned an empty brief. The friendly empty-Workspace action
   error was checked with a mocked key/client context; the live absent-key error takes priority.
10. Live generation with the key absent returned the configuration error and created nothing.
    No deployment environment variable was removed or restored because there was no key.

The temporary action harness bundles the actual action with the already-installed esbuild,
then substitutes `fetch` and Convex context in memory. It checks the exact `claude-opus-5`,
adaptive/high-effort request and seven-variant JSON schema, result metadata, source scope,
invalid inputs, missing key, empty Workspace, refusal, token limit, malformed JSON, 5–24 Block
limit, Heading-first rule and API errors without retries. These are **mocked protocol checks**,
not evidence that the Claude service accepts the request or produces good Reports.

### Electron

Real app: `npm run dev -- --remote-debugging-port=9340`; renderer at localhost:5174.
Keyboard checks covered opening the dialog, initial focus, native controls, Focus text, Cancel,
Generate and Escape. A temporary renderer network disconnect held the action pending without
sending a paid request, proving the status, disabled form and native Escape prevention. Restoring
network returned the real configuration error; name and Focus remained intact. Light/dark
screenshots `/tmp/p10c-dialog-light.png` and `/tmp/p10c-dialog-dark.png` were visually inspected.

A fixture Generated Report opened, hid Player clip columns, accepted heading edits/reordering,
restored a deleted Block with Undo and rendered in Report Preview. The existing PDF export
implementation was unchanged; native PDF export was not re-exercised in this phase.

The built app launched with `node_modules/.bin/electron . --remote-debugging-port=9341`.
The production `file://` renderer displayed the Report list and Generate with AI button, with
its existing PDF bridge present. `npm run preview -- --remote-debugging-port=9341` first rejected
that unsupported flag; direct launch used the built entry point. There is no distribution
packaging script/configuration in this project, so a distributable installer was not produced.

Temporary UI harness failures were corrected and rerun: asynchronous dev reload, native text
selection, hidden menu items being selected instead of visible Block actions, and the actual
`filmStudy.exportReportPdf` preload name. They were not counted as passing checks.

## Decisions, assumptions and deviations

- **A1:** reuse included Source Games; no picker added. Enforced in brief and materializer,
  including snapshot provenance, attached diagrams and linked Player Notes. Workspace-level
  profiles and unlinked Player Notes remain available.
- **A2:** reuse all eleven Coaching Areas with a settings-derived default that does not reset
  an explicit selection. Actual coach-type differentiation is still a hard gate awaiting key.
- **A3:** Node action deploys and executes the configuration-error path. Real outbound Claude
  connectivity is not proven without a key.
- **A4:** SDK installation and Convex Node bundling work without extra configuration. No fetch
  fallback or additional dependency was needed.
- **A5:** installed SDK typechecks adaptive thinking and `output_config`; no JSON-only fallback
  was needed. Service acceptance of the pinned model/schema remains unverified. The schema is
  derived from the Convex validator using its public members/fields; numeric kind `float64`
  maps to JSON Schema `number`. Character/count limits are enforced server-side, consistent
  with [Anthropic structured-output schema limitations](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
- **A6:** fixtures fit the existing 800 KB guard. Large real generated Reports remain unmeasured;
  generation still validates size before its only insert.
- **A7:** real API latency/action timeout is unmeasured. No scheduling infrastructure added.
- The action returns `{ reportId, blockCount, skipped }` instead of an ID alone, resolving the
  plan's conflicting return/toast requirements. The callback carries the ID and skip count.
- The action landed with 10C.3 rather than 10C.2 to avoid committing a reference to a mutation
  that did not yet exist. Generated API declarations were updated by Convex codegen.
- `buildBlock` accepts only the Report's `workspaceId`, the sole field it reads. This allows
  materialization before inserting a Report, with no fake document or empty intermediate row.
- Structured output uses a `{ blocks: [...] }` transport object; the mutation still validates
  the array. The model response must have 5–24 Blocks and start with a Heading. As explicitly
  required by the bad-reference fixture, skipped references may leave fewer than five usable
  Blocks; zero usable Blocks fail atomically.
- Name/coach/focus validation happens before paid calls; SDK automatic retries are disabled.
  `ConvexError` preserves actionable errors for the renderer. Native Escape requires explicit
  `onCancel.preventDefault()`, beyond the existing picker's open-change guard.
- Source Games are checked again after the model call; if their included set changed, generation
  fails with a retry message before inserting. Tendencies honor the existing Include in reports
  checkbox. Unknown references and ambiguous Source Game labels are skipped.
- Player count and total Player Notes both use the existing 60-note brief limit. Saved Tendency
  and Play Diagram lists follow the plan without an additional arbitrary cap. Very large
  notebooks can still hit Convex read/context limits; no speculative caching was added.
- Snapshot statistics are sourced exclusively by the existing Block builder. **Model prose is
  not structurally guaranteed hallucination-free.** The prompt forbids numerical statistics in
  prose and invented judgments; that is an instruction, not a mathematical guarantee. Real
  output review is still required to satisfy the plan's content-quality criteria.
- Fresh fixture mutation calls replaced paid generation where possible. No test doubles were
  deployed, no key was invented, and no real Claude generation was counted as verified.

## Cost and latency

**Real generation calls: 0.** Paid generation cost and latency are **not measured**; there is
no `response.usage` evidence. No temporary usage logger was added to production code. Once a
key is configured, measure one successful generation and complete the bounded live checks;
keep the plan's total 10–20-call budget and do not loop retries.

## Cleanup and real-data preservation

- Fixture Season: `k176sm84dzarkj3sy831veb5px8ejp7f`.
- Fixture Workspace: `kx7fdsjg0cgk4ds5et0tpxv1e58ekvye`.
- Six verification Reports were individually soft-deleted, then the fixture Season and its
  descendants were soft-deleted. Follow-up reads showed no fixture Season or live Reports.
- Real Source Game `k97b7a9kqaxfs1fhxzdx0tvtcx8ecycv`: **18 Snaps before and 18 after**.
  The earlier phase's 232 count was not assumed; this session captured the current baseline.
- Deep comparisons passed for all real Snaps, the pre-existing Report (including `updatedAt`),
  Tendencies, diagrams, Quick Notes, Opponent Players and Player Notes read in the real scope.
  Verification never wrote to those records or changed active Season/settings.
- Evidence: `/tmp/p10c-ids.json` and `/tmp/p10c-cleanup.json`.

## Remaining acceptance work

Configure `ANTHROPIC_API_KEY` securely on Convex, then generate a real Coach Report and compare
its tables to Opponent Data; repeat with an excluded Source Game; compare Defensive Line versus
Quarterbacks; generate/review Player prose and the live empty-Workspace error; verify success
navigation/skip toast and native PDF export. Measure one call's usage/latency, remove its logger,
and clean every new verification Report/fixture afterward. Until these checks pass, Phase 10C
remains implemented but not fully accepted.

## Follow-up — generated-plan contract (2026-09-17)

Two owner-reported live calls reached the combined 5–24 Blocks / Heading guard. The old error
and logs did not retain enough information to distinguish count, heading or shape failure.
Inspection confirmed that the structured-output schema allowed an empty/short array and any
first Block despite the stronger prompt and downstream requirements. Anthropic does not support
`minItems: 5`; adding that constraint would reject the API request.

The transport now requires a Heading descriptor, four subsequent Block descriptors, and an
`additionalBlocks` array. The reader flattens these into the existing materializer array, so
valid structured output guarantees the minimum and opening Heading. The 24-Block ceiling stays
enforced; failures now distinguish missing fields, wrong opening type and the actual excess
count. Report storage and snapshot construction are unchanged.

A temporary mocked-action regression failed before the change and passed after it, covering the
five-Block opening, 24-Block boundary, 25-Block rejection and malformed response. Typecheck,
production build and all 15 existing tests passed. No paid call or notebook mutation was made
for this fix; the actual offending responses remain unavailable and live success is not claimed.

## Follow-up — preserve Claude API errors (2026-09-17)

The owner next encountered the generic request-failure message. That catch discarded the
provider's status/body, so the underlying cause (schema, authentication, rate limit, connection
or service failure) cannot be established from the historical log. The Node action now surfaces
the SDK API error message, bounded to 1,000 characters and with the configured API key redacted.
It does not log the request, brief or headers. No speculative schema change or automatic retry
was added. A temporary regression check failed before and passed after the change for mocked
400, 401, 429, 529 and connection failures, including redaction and zero mutations/retries.
The actual generation failure remains unresolved until its provider error is available.
