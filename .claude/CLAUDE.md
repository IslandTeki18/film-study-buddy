# film-study-buddy — Agent Conventions

Read blueprint.md before implementation and follow TASKS.md in dependency order. Build these applications: desktop (desktop).

## TypeScript

Enable strict mode throughout. Prefer unknown with narrowing over any. Validate external inputs at trust boundaries and keep shared domain types consistent with Convex validators.

## Data and Authentication

Treat Convex as the source of truth for application data, profiles, and permissions. When authentication is selected, use Clerk for identity and sessions; enforce authorization in Convex functions as well as the UI. Keep secrets on the server and out of source control.

## Code Placement

Place app-specific screens, navigation, providers, and reusable UI in the application source directory. Keep backend functions and schemas in convex/. Reuse domain types and business logic within the project.

## Naming and Implementation

Use kebab-case for project, app, file, and directory names. Follow the selected platform conventions for required framework filenames.

**Exception — everything under `convex/`.** Convex rejects a push when any file or directory it
bundles has a name outside `[A-Za-z0-9_.]`, so hyphens are impossible there:

```text
InvalidConfig: domain/core-fields.js is not a valid path to a Convex module.
Path component core-fields.js can only contain alphanumeric characters, underscores, or periods.
```

Inside `convex/`, use **camelCase** for files and directories: `coreFields.ts`, `fieldZone.ts`,
`sourceGames.ts`, `opponentData.ts`, `starterTemplates.ts`, `csvMapping.ts`, `themeSettings/`.
camelCase over snake_case because the module path becomes the generated API surface, and
`api.sourceGames.list` is the Convex convention while `api.source_games.list` is not.

Two consequences worth knowing before they cost time:

- It is the **presence** of the file that fails the push, not any import of it. An unimported
  hyphenated file under `convex/` breaks `npx convex dev` on its own, so no import style avoids it.
- `convex/_generated/` is exempt (the underscore is legal) and `src/` is unaffected — kebab-case
  still applies there, including `src/features/theme-settings/`.

`.claude/BLUEPRINT.md` §4 and §6 still spell these paths with hyphens. The camelCase names above
override that spelling; the blueprint's structure and module boundaries are unchanged. Implement only the specified features. Use accessible controls, keyboard navigation where supported, and clear loading and error states. Surface failures without silently discarding user data.

## Verification

Complete the checklist in order and mark items done only after verifying their behavior. Run strict type checking and production builds. Document required environment variables and local setup instructions in the project README.
