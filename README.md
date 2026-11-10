# film-study-buddy

A personal film-study notebook for a **defensive line coach**: an Electron desktop app, backed by
Convex, for charting an opponent's offense from Hudl exports and turning it into tendencies,
scout cards and reports for the defensive line room.

## Scope

Built for one coach and one position. There is no position picker and no other-position templates.

- **First launch** installs the Defensive Line charting template automatically.
- **DL charting fields** (Home → DL charting fields): one editable template with Pre-Snap
  (OL splits, stance, TE and back alignment), Run Game (blocking scheme, point of attack, pullers,
  double teams) and Pass Game (protection, QB drop, chips, launch point, rush opportunity).
- **Charting** covers the opponent's offense only. Player notes group their offense with the
  blockers first: OL, TE, backs, QB, receivers.
- **Play Designer** draws the offense plus your front: rush lanes, stunts (slant, loop) and
  pressures. It has no coverage tools.
- **Tell Finder** also searches the Pre-Snap fields (any select, checkbox or rating field in a
  section named "Pre-Snap"), so it can surface tells like "OL Stance: Heavy → Run".
- **Tendencies, Reports, Practice Scripts and Scout Cards** default to DL vocabulary
  (Pre-Snap Tell, Pass Protection, OL Tell, Pullers, Double Team, and run-scheme play concepts).
- **Generate with AI** always writes for the defensive line.

Data from the older multi-position build still loads: a stored coaching area is ignored, and
defensive-side opponent players stay saved but are no longer listed.

## Stack

| Layer | Choice |
| --- | --- |
| Shell | Electron 44 via electron-vite |
| Renderer | React 19, TypeScript (strict), Tailwind CSS 4, ShadCN-style components |
| Backend | Convex |

## Requirements

- Node.js 22+ (the test script uses `node --experimental-strip-types`)
- A Convex account for `npx convex dev`

## Setup

```bash
npm install
cp .env.example .env
npx convex dev          # configures the deployment, writes CONVEX_DEPLOYMENT, regenerates convex/_generated
```

Copy the deployment URL printed by `npx convex dev` into `.env` as `VITE_CONVEX_URL`, then:

```bash
npm run dev             # Electron + Vite dev server with HMR
```

With `VITE_CONVEX_URL` unset the app still opens and shows a banner saying so, but only theme
settings work: every film-study screen needs Convex. Uncaught render errors are caught by `src/components/error-boundary.tsx` and
displayed, since a desktop window has no visible console.

## Environment Variables

| Key | Description | Feature |
| --- | --- | --- |
| `VITE_CONVEX_URL` | Convex deployment URL used by the renderer client. | Convex wiring |
| `CONVEX_DEPLOYMENT` | Written by the Convex CLI. Never commit the real value. | Convex wiring |
| `ANTHROPIC_API_KEY` | Claude API key used by AI Report generation. Set on the Convex deployment with `npx convex env set`; never committed. | AI Report generation |

## AI Report generation

Generate with AI requires network access and a Claude API key on the Convex deployment.
Each generation is a paid API call. The Workspace brief, including opponent identity and
scouting notes, is sent to Anthropic. Keep the key on the deployment, never in `.env.local`
or renderer code. With the key unset, the button remains visible and returns a clear error.
Generated Reports are created directly and remain fully editable in the Report Builder.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Electron app against the Vite dev server |
| `npm run build` | Typecheck, self-checks, then production build into `out/` |
| `npm run typecheck` | `tsc --noEmit` across renderer, main and Convex code |
| `npm test` | Theme resolution and storage self-checks |
| `npm run convex:dev` | Convex dev server and codegen only |

## Structure

```text
film-study-buddy/
├── electron/main.ts                  # Main process: window, drag region, external links
├── src/
│   ├── index.html                    # Pre-render theme bootstrap script lives here
│   ├── main.tsx                      # Error boundary + optional Convex provider + ThemeProvider
│   ├── convex-client.ts              # Client from VITE_CONVEX_URL, or null when unset
│   ├── app.tsx                       # First-launch gate and scroll shell
│   ├── components/app-header.tsx     # Top bar for Home and top-level screens (Film Room design)
│   ├── components/workspace-header.tsx # Opponent identity, actions and workspace tab strip
│   ├── components/ui/                # ShadCN-style primitives plus panel.tsx (Panel, Eyebrow, Meta, Chip, Page)
│   ├── features/theme-settings/      # theme.ts, theme-provider.tsx, theme-toggle.tsx, convex-theme-sync.tsx
│   ├── features/templates/           # DL charting fields editor (sections, fields, Play Log views)
│   └── routes/                       # One file per screen; charting-fields-page.tsx is the template editor
└── convex/
    ├── schema.ts                     # All tables
    └── domain/dlTemplate.ts          # The Defensive Line template installed at first launch
```

## Theme Settings

Purpose: one theme choice (`light`, `dark`, `system`) applied consistently across the app.

- **Bootstrap.** An inline script in `src/index.html` reads `localStorage` and sets the `dark`
  class plus `color-scheme` on `<html>` before the bundle loads, so the shell never paints in
  the wrong appearance. Its logic mirrors `src/features/theme-settings/theme.ts`; change both
  together.
- **Resolution.** `system` resolves through `matchMedia('(prefers-color-scheme: dark)')`, which
  in Electron follows the operating system appearance. The provider subscribes to changes only
  while `system` is selected and removes the listener on unmount or preference change.
- **Application.** The effective theme toggles the `dark` class on the document root, so every
  CSS variable in `src/index.css` and every Tailwind `dark:` rule updates at once.
- **Persistence.** Anonymous preferences live in `localStorage` under
  `film-study-buddy.theme`. Reads and writes are wrapped in `try/catch`; unavailable storage
  degrades to the `system` default rather than throwing.
- **Convex.** `convex/theme_settings/preferences.ts` returns `null` and no-ops without a signed-in
  user, which is always the case in this build (Auth is not selected). The client prefers a
  non-null server value on first load and otherwise keeps using local storage.
- **Surface.** `ThemeProvider` mounts at the app root, `useTheme()` is the shared hook, and the
  same `ThemeToggle` control appears compactly in the sidebar and full-width in Settings.

### Edge cases and failure modes

| Case | Behavior |
| --- | --- |
| `localStorage` unavailable or full | Falls back to `system`; the choice still applies for the window's lifetime. |
| Stored value not one of the three preferences | Ignored; `system` is used. |
| OS appearance changes while `system` is selected | Applied live via the media-query listener. |
| OS appearance changes while `light`/`dark` is selected | Ignored; no listener is registered. |
| `VITE_CONVEX_URL` unset | App runs local-only and shows a configuration banner. |
| Convex query still loading | Local preference renders immediately; a server value can adopt once. |
| Convex mutation fails | Logged; the local preference is already applied and persisted. |

## Adding Auth later

1. Add the users table with
   `themePreference: v.optional(v.union(v.literal('light'), v.literal('dark'), v.literal('system')))`
   in `convex/schema.ts`.
2. Fill in the two identity branches in `convex/theme_settings/preferences.ts`.

No renderer change is required; the provider already reads and writes those functions.
