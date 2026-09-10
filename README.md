# film-study-buddy

Electron desktop shell for Film Study Buddy, backed by Convex.

This build implements the scope in `.claude/blueprint.md`: the
`desktop-sidebar` application shell and the **theme-settings** feature. Film study workflows
from `.claude/spec.md` are out of scope here.

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

With `VITE_CONVEX_URL` unset the app still runs and shows a banner saying so: theme settings
are local-storage backed until Auth is selected, so no Convex round-trip is required to use
this build. Uncaught render errors are caught by `src/components/error-boundary.tsx` and
displayed, since a desktop window has no visible console.

## Environment Variables

| Key | Description | Feature |
| --- | --- | --- |
| `VITE_CONVEX_URL` | Convex deployment URL used by the renderer client. | Convex wiring |
| `CONVEX_DEPLOYMENT` | Written by the Convex CLI. Never commit the real value. | Convex wiring |

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
│   ├── app.tsx                       # Sidebar shell and view switching
│   ├── components/app-sidebar.tsx    # desktop-sidebar navigation
│   ├── components/ui/button.tsx      # ShadCN-style primitive
│   ├── features/theme-settings/      # theme.ts, theme-provider.tsx, theme-toggle.tsx, convex-theme-sync.tsx
│   └── routes/                       # home-page.tsx, settings-page.tsx
└── convex/
    ├── schema.ts                     # No tables: theme settings need none without Auth
    └── theme_settings/preferences.ts # get/set, null for anonymous users
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
