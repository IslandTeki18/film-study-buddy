# Hosted accounts and a downloadable release

Plan for Codex. Part 1 (accounts and data isolation) must ship before Part 2 (signed download).
Part 2 has no value while every install shares one database.

## Task decision

**SPLIT, then PROCEED with Part 1.** The user chose hosted Convex with accounts (option B) over a
local backend per install.

| Part | Outcome | Depends on |
| --- | --- | --- |
| 1. Accounts | Each coach signs in with Clerk; every Convex function reads and writes only that coach's data; a production Convex deployment holds it. | Clerk production instance, Convex production deployment |
| 2. Release | A signed, notarized, auto-updating `.dmg` on a download page. | Part 1, Apple Developer Program |

### Problem (verified)

| Fact | Source |
| --- | --- |
| The packaged app has one `VITE_CONVEX_URL` baked in, so every install would share the developer's dev deployment. | `README.md` "Installed app", `.env.local` |
| No Convex function checks the caller. No `ctx.auth`, `getUserIdentity`, or Clerk anywhere. | grep over `convex/`, `src/`, `electron/` |
| About 123 public queries, mutations and actions across 20 modules. | per-module count of `= query(`, `= mutation(`, `= action(` |
| Root tables with no owner: `seasons`, `templates`, `settings` (a singleton), `terminology`, `importMappings`, `formations`, `tendencyCategories`, `deletions`. Everything else hangs off `seasons → workspaces → sourceGames → snaps` or `templates`. | `convex/schema.ts` |
| Liveness guards already walk the chain: `requireLiveSeason`, `requireLiveWorkspace`, `requireLiveSourceGame`, `requireLiveSnap`, `requireLiveTemplate`, and per-module `requireLive*`. | `convex/seasons.ts:9`, `workspaces.ts:11`, `sourceGames.ts:18`, `snaps.ts:36`, `templates.ts:14` |
| Some handlers bypass the guards and re-walk the chain inline (for example `snaps.listBySourceGame`, `snaps.countIncomplete`). | `convex/snaps.ts:21-40`, `318-332` |
| Global unique lookups: `terminology.by_list`, `importMappings.by_signature`, `formations.by_name`. | `convex/schema.ts:70,81,246` |
| AI Report generation uses one `ANTHROPIC_API_KEY` on the deployment. | `convex/aiReportsNode.ts:19` |
| Clerk ships an official Electron SDK: `createClerkBridge` (main), `exposeClerkBridge` (preload), `ClerkProvider` from `@clerk/electron/react` (renderer, re-exports `@clerk/react`). The renderer must be served from a custom scheme, because Clerk rejects `file://` as an origin. | Clerk docs: Electron quickstart, OAuth deep links, Electron deployment |
| The packaged renderer currently loads via `loadFile` (`file://`). | `electron/main.ts` `createWindow` |
| Project convention: Clerk for identity, authorization enforced in Convex functions as well as the UI. | `.claude/CLAUDE.md` "Data and Authentication" |

### Spec and glossary conflicts (must change, user-approved by choosing B)

- SPEC §3: "local-first and offline-capable", "V1 requires no account or login".
- SPEC §92: "V1 installations are independent", "A coach's local machine owns the V1 data".
- `ubiquitous-language.md` Non-Terms lists "User, account, sign-in, permission" and "Sync, cloud, device".

### Decisions taken

| Decision | Choice |
| --- | --- |
| Data model | Hosted Convex production deployment, Clerk accounts (user choice) |
| Ownership model | `ownerId` on root tables only; children inherit through the existing parent chain. Avoids a migration of every table. |
| Owner key | `identity.tokenIdentifier` from `ctx.auth.getUserIdentity()` (stable per Clerk user and issuer) |
| Development | Keep the current dev deployment and a Clerk development instance for `npm run dev` |
| AI Report generation | Stays on the developer's `ANTHROPIC_API_KEY`, capped at 5 generations per account per day (A2 confirmed by the user) |

### Assumptions (defaults chosen; confirm before Part 1 slice S7)

- A1. Sign-in methods: email verification code and Google.
- A2. Confirmed: AI Report generation stays on the developer's key with a per-account daily cap
  of 5 generations. The day boundary is UTC (`YYYY-MM-DD` from the server clock).
- A3. The app is free; no billing, teams, or sharing in this plan.
- A4. Offline use is dropped: with no connection the app shows a clear "Offline" state. Convex
  does not persist queued writes across restarts.
- A5. `@clerk/electron/react`'s `useAuth` works with `ConvexProviderWithClerk` from
  `convex/react-clerk`. Verified only by docs; slice S1 proves it.

## Acceptance criteria

### Part 1

| # | Criterion | Proof |
| --- | --- | --- |
| AC1 | A signed-out app shows only the sign-in screen; no Convex query runs before sign-in. | M1 |
| AC2 | Sign in with email code and with Google works in the packaged app (Google uses the custom-scheme deep link). | M2 |
| AC3 | Coach A's Seasons, Workspaces, Source Games, Snaps, Templates, Terminology, Formations, Reports and Practice Scripts are invisible to Coach B. | M3 |
| AC4 | Every public function rejects a signed-out call with `Not signed in`, and rejects another coach's id with the same `not found` error a deleted record gives (no existence leak). | V4, M4 |
| AC5 | First launch for a new account installs Starter Coaching Templates and default Tendency Categories for that account only. | M5 |
| AC6 | Existing developer data is claimed by the developer's account once, and nothing else can claim it. | M6 |
| AC7 | The daily purge cron still removes expired soft deletes for all accounts. | V5 |
| AC8 | AI generation past the daily cap returns a clear error and makes no API call (A2). | M7 |
| AC9 | Sign out clears the stored session (encrypted with `safeStorage`) and returns to sign-in. | M8 |
| AC10 | Typecheck, tests, build pass; README documents both Clerk instances and both Convex deployments. | V1, V2, V3 |

### Part 2

| # | Criterion | Proof |
| --- | --- | --- |
| AC11 | The downloaded `.dmg` opens on a clean Mac without a Gatekeeper warning. | `spctl -a -vv` and M9 |
| AC12 | A newer published release offers an in-app update. | M10 |

## Relevant repository map

| Area | Files | Change |
| --- | --- | --- |
| Main process | `electron/main.ts` | Custom scheme, `createClerkBridge`, navigation guards, single instance |
| Preload | `electron/preload.ts` | `exposeClerkBridge()` (keep the existing report export bridge) |
| Renderer entry | `src/main.tsx`, `src/convex-client.ts` | `ClerkProvider` + `ConvexProviderWithClerk`, sign-in gate |
| Renderer CSP | `src/index.html` | Allow Clerk frontend API and image hosts in `connect-src`, `img-src`, `frame-src` as Clerk requires |
| Auth config | `convex/auth.config.ts` (new) | Clerk issuer domain from env |
| Ownership helper | `convex/ownership.ts` (new) | `requireOwnerId`, `requireOwned` |
| Schema | `convex/schema.ts` | `ownerId` + owner-prefixed indexes on root tables |
| Guards | `seasons.ts`, `templates.ts`, `settings.ts` and every module's `requireLive*` | Check owner at the root |
| All handlers | 20 modules in `convex/` | Route through guards; list queries filter by owner index |
| Cron | `convex/crons.ts`, `convex/deletions.ts` | Purge stays global (internal) |
| AI | `convex/aiReportsNode.ts`, `convex/aiReports.ts` | Daily cap per owner |
| Docs | `README.md`, `.claude/SPEC.md` §3 §92, `ubiquitous-language.md` | Accounts, deployments, terms |
| Packaging | `package.json` `build` | Scheme registration (`protocols`), later signing |

## Implementation slices (Part 1)

Each slice ends type-checking. S1 is a spike that can stop the plan.

### S1. Spike: Clerk in this Electron app

- Add `@clerk/electron`, `convex/react-clerk` usage.
- Main: register scheme `film-study-buddy://renderer` as privileged/standard/secure before
  `app.ready`, serve `out/renderer` through `protocol.handle` (path-traversal guard as in the
  Clerk guide), load it instead of `loadFile` when packaged. Add `will-navigate`/`will-redirect`
  guards; keep the existing `setWindowOpenHandler`.
- `createClerkBridge({ storage: storage(), renderer: { scheme, host } })`; gate on
  `clerk.isPrimaryInstance`.
- Preload: `exposeClerkBridge()`. The preload is sandboxed, so confirm electron-vite bundles it
  into `preload.cjs` with no runtime `require` of `@clerk/electron`.
- Renderer: `ClerkProvider` → `ConvexProviderWithClerk client={convexClient} useAuth={useAuth}`.
- Exit condition: in a packaged build against the dev deployment, sign in with email code and
  Google, and a test query sees `ctx.auth.getUserIdentity()` non-null. If any part fails, stop and
  report; do not continue to S2.

### S2. Convex auth config and ownership helper

- `convex/auth.config.ts`: `{ providers: [{ domain: process.env.CLERK_JWT_ISSUER_DOMAIN, applicationID: 'convex' }] }`.
  Create the `convex` JWT template in both Clerk instances.
- `convex/ownership.ts`:
  ```ts
  export async function requireOwnerId(ctx: QueryCtx | MutationCtx | ActionCtx): Promise<string> // throws ConvexError('Not signed in')
  export function requireOwned<T extends { ownerId?: string }>(doc: T | null, ownerId: string, label: string): T // throws the same not-found error the guards use today
  ```

### S3. Schema

- Add `ownerId: v.optional(v.string())` to `seasons`, `templates`, `settings`, `terminology`,
  `importMappings`, `formations`, `tendencyCategories`, `deletions`. Optional only until S6
  backfill, then required in S8.
- Index changes: `seasons.by_owner_deletedAt`, `templates.by_owner`, `settings.by_owner`,
  `terminology.by_owner_list ['ownerId','list','value']`,
  `importMappings.by_owner_signature`, `formations.by_owner_name`, `tendencyCategories.by_owner`,
  `deletions.by_owner_batchId`. Keep the old indexes until S8 so the deployed app keeps working.

### S4. Root guards

- `requireLiveSeason`, `requireLiveTemplate` (and its section/field/view helpers via
  `templateId`), `requireSettings`: take the owner id and call `requireOwned`.
- `requireLiveWorkspace`, `requireLiveSourceGame`, `requireLiveSnap` already load the parent
  chain; make them end at `requireLiveSeason` with the owner check, so one change covers every
  child.
- Module guards that do not walk to a root today (`requireLiveDiagram`, `requireLivePlayer`,
  `requireLiveNote`, `requireLiveQuickNote`, `requireLiveReport`, `requireLiveScript`,
  `requireLiveTendency`, `liveWorkspace` in `reports.ts`): call `requireLiveWorkspace` or
  `requireLiveSourceGame` for their parent.

### S5. Handlers, module by module

For every public function in the 20 modules:

1. First line: `const ownerId = await requireOwnerId(ctx)`.
2. Every id argument goes through a guard from S4. Inline chain walks (for example
   `snaps.listBySourceGame`, `snaps.countIncomplete`) are replaced by the guard.
3. Root list queries use the owner index (`seasons.list`, `templates.list`, `terminology.list`,
   `formations.list`, tendency categories, settings).
4. Root inserts set `ownerId`.
5. Cross-record references in arguments (for example `diagramId` on a Tendency,
   `gameIds` in a snapshot, `snapIds` on a Player Note, `templateId` on a Source Game) are each
   checked to belong to the same owner.
6. `deletions.undo` checks the batch's `ownerId`.
7. `hudlImport` mapping lookup uses `by_owner_signature`.
8. `aiReportsNode` action: resolve the owner, check the Workspace through an internal query, then
   apply the cap (S7).

Work order: `seasons`, `settings`, `workspaces`, `sourceGames`, `snaps`, `notes`, `templates`,
`columnLayouts`, `terminology`, `formations`, `hudlImport`, `opponentPlayers`, `diagrams`,
`tendencies`, `opponentData`, `tells`, `reports`, `practiceScripts`, `deletions`, `aiReports*`.

### S6. Claim existing data

- `internalMutation claimUnowned({ ownerId })`: sets `ownerId` on every root row where it is
  missing; refuses if any row already has a different owner.
- Run once from the Convex dashboard on the deployment that holds the developer's data, with the
  developer's `tokenIdentifier` (shown by a temporary `whoami` query from S1).
- To move data to production: `npx convex export` from dev and `npx convex import` into the
  production deployment, then run `claimUnowned` there. Requires the Convex CLI signed in to the
  account that owns the project (currently it is not).

### S7. First launch and AI cap

- `settings.get` returns `null` for an account with no settings row; `completeFirstLaunch`
  inserts the account's settings, Starter Coaching Templates, and default Tendency Categories with
  `ownerId`.
- AI cap: an `aiUsage` table `{ ownerId, day: 'YYYY-MM-DD', count }` with index
  `by_owner_day`; the action calls an internal mutation that increments or throws
  `ConvexError('Daily AI report limit reached (5). Try again tomorrow.')` before calling the API.
  Constant in `convex/domain/aiReport.ts`.

### S8. Tighten

- After S6 runs on every deployment: make `ownerId` required, drop the old global indexes,
  remove `claimUnowned`.

### S9. Renderer sign-in gate and account UI

- `SignedOut` → Clerk `<SignIn />` full-window, styled with theme tokens.
- `SignedIn` → existing router.
- Sidebar footer: account menu with Sign out (`<UserButton />` or a menu item calling `signOut`).
- Convex errors `Not signed in` show "Session expired, sign in again" and route to sign-in.
- Offline: Convex connection state shown as an "Offline" banner (A4).

### S10. Production deployment and docs

- Create the Convex production deployment (`npx convex deploy`), set `CLERK_JWT_ISSUER_DOMAIN`
  and `ANTHROPIC_API_KEY` there.
- Clerk production instance: allowed origin `film-study-buddy://renderer`, Google OAuth
  credentials, `convex` JWT template.
- Build-time env for release: `.env.production` (gitignored) with production `VITE_CONVEX_URL`
  and `VITE_CLERK_PUBLISHABLE_KEY`; `npm run package` must use it. Document in README with the
  required variables in both environments.
- Update SPEC §3 and §92 and `ubiquitous-language.md` (Account, Sign-in; remove from Non-Terms)
  through the `domain-modeling` skill.

## Part 2: release steps (after Part 1)

| # | Step | Detail |
| --- | --- | --- |
| R1 | Apple Developer Program | Enroll; create a Developer ID Application certificate. |
| R2 | Signing | `mac.identity` set, `hardenedRuntime: true`, `entitlements` with JIT and network client. |
| R3 | Notarization | electron-builder `mac.notarize` with an App Store Connect API key from env, never committed. |
| R4 | Identity | `build/icon.icns` (1024px source), `description`, `author`, version `1.0.0`. |
| R5 | Architectures | `mac.target` `dmg` + `zip` for `universal` (or `arm64` + `x64`). `zip` is required by the updater. |
| R6 | Deep links | `build.protocols` registers `film-study-buddy` so Google sign-in returns to the app. |
| R7 | Auto-update | `electron-updater`, `publish: github`, check on launch, prompt to restart. |
| R8 | Hosting | GitHub Releases plus a download page; privacy notice for AI generation and accounts. |

## Validation plan

| ID | Command | Expected |
| --- | --- | --- |
| V1 | `npm run typecheck` | Exit 0 |
| V2 | `npm run build` | Typecheck, tests and electron-vite build pass |
| V3 | `npm run package` | `.app` and `.dmg` in `dist/` |
| V4 | `node scripts/check-auth-guards.mjs` (new, small) | Lists zero public handlers in `convex/*.ts` whose body lacks `requireOwnerId(`; exits 1 otherwise |
| V5 | Dashboard: run `deletions:purgeExpired` on the dev deployment with two accounts' expired rows | Both accounts' expired rows removed |
| V6 | `spctl -a -vv "dist/mac-universal/Film Study Buddy.app"` (Part 2) | `accepted`, `source=Notarized Developer ID` |

## Manual-only checks

Two Clerk test accounts (A, B) on the dev instance, packaged build against the dev deployment.

| ID | Steps | Expected |
| --- | --- | --- |
| M1 | Launch signed out. | Sign-in screen only; Convex dashboard logs show no app queries. |
| M2 | Sign in with email code; sign out; sign in with Google. | Both reach the app; Google returns through the deep link. |
| M3 | A creates a Season, Workspace, Source Game, Snaps, Template, Formation, Report. Sign in as B. | B sees none of them and gets First Launch. |
| M4 | As B, call a query from the dashboard "Run function" with A's Season id, and with no auth. | `not found` and `Not signed in` respectively. |
| M5 | New account C completes First Launch. | C has Starter Templates and default categories; A and B unchanged. |
| M6 | Run `claimUnowned` with A's id, then again with B's id. | First claims all unowned rows; second refuses. |
| M7 | As A, generate 6 AI Reports in one day. | Sixth returns the limit error; Anthropic usage shows 5 calls. |
| M8 | Sign out, quit, relaunch. | Sign-in screen; no stored session. |
| M9 | Download the published `.dmg` on a Mac that never had the project (Part 2). | Opens without warning; sign-in works. |
| M10 | Publish `1.0.1`; open `1.0.0`. | Update offered and applied after restart. |

## Risks and rollback

| Risk | Impact | Mitigation |
| --- | --- | --- |
| A handler missed in S5 | Cross-account data leak | V4 static check plus M4 per module; guards at the root catch most child paths |
| Existence leak through different errors | Ids from another account can be probed | `requireOwned` reuses the exact not-found message |
| Clerk Electron SDK is new | Spike fails or breaks on update | S1 is a stop point; pin the version |
| Sandboxed preload cannot load the bridge | Sign-in impossible | Confirm bundling in S1 |
| CSP blocks Clerk | Blank sign-in | Add Clerk's documented hosts in S1 |
| Schema change while old installs exist | Old app breaks on new functions | Optional fields first (S3), required only in S8 after data claim; Part 2 auto-update keeps installs current |
| Convex CLI signed in to the wrong account | Cannot deploy or export | Developer runs `npx convex login` before S6 and S10 |
| Running costs | Convex, Clerk, Anthropic bills grow with users | AI cap (A2); free tiers cover early use |

Rollback: Part 1 lands behind the dev deployment first. Until S8, old indexes and optional
`ownerId` keep the previous build working; reverting the commits restores it. S8 is the
one-way step and runs only after M3 to M6 pass on production.

## Explicitly excluded work

- Local backend per install (option A).
- Teams, sharing a Workspace between coaches, roles, billing.
- Offline write queueing.
- Windows build.
- Backup/restore UI (hosting provides durability).
- Changes to Play Log, Reports or any feature behavior beyond scoping by account.
- Tests (consistent with prior plans), except the V4 static guard check.
