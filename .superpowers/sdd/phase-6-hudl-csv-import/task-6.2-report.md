# Step 6.2 — Upload and parse report

Status: complete on `main`; Electron verification is delegated to the controller.

## Changes

- Added `parse-csv.ts` with the specified file/type checks and Papa Parse settings. Parsing
  always resolves to parsed data or a discriminated error, including rejected file reads.
- Rejected exact duplicate headers reported through Papa's `renamedHeaders` metadata and
  case/whitespace-equivalent duplicates detected with the reviewed `normalizeHeader` domain
  function. This prevents Papa's automatic renaming from silently changing column identity.
- Added the accessible upload step and named empty, non-CSV, and malformed error messages.
  Successful parsing advances to the Step 6.3 mapping skeleton without importing data.
- Added the route-backed wizard, its Source Game loading/not-found states, and a keyed child
  keyed by Workspace/Source Game so route changes discard another game's selected file.
- Replaced the route placeholders with the wizard and removed `import-preview-page.tsx`.

## Verification

- `node --experimental-strip-types /tmp/task-6.2-parse-check.mjs` — passed. Scratch assertions
  cover trimming, valid parsing, zero-byte files, rejected MIME/extension, fewer than two
  columns, no data rows, exact duplicates, normalized duplicates, and file-read rejection.
- `npm run typecheck` — passed with strict TypeScript settings.
- `npx convex dev --once` — passed against the configured development deployment; Convex
  reported functions ready. No generated file changed.
- `git diff --check` — passed.

## Limits and concerns

- Verification uses synthetic files because the real Hudl CSV is unavailable, per the phase
  ruling. The scratch script remains under `/tmp`; no persistent test was added.
- The mapping and preview bodies are deliberately skeletal for Steps 6.3–6.5. Parsed file
  state is memory-only and resets on route identity changes or reload, per Decision D8.
- The controller owns the requested Electron checks for PNG, zero-byte CSV, sample advance,
  and confirming that parse errors create no Snaps.

Commit: recorded after report creation in the task handoff.
