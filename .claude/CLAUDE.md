# film-study-buddy — Agent Conventions

Read blueprint.md before implementation and follow TASKS.md in dependency order. Build these applications: desktop (desktop).

## TypeScript

Enable strict mode throughout. Prefer unknown with narrowing over any. Validate external inputs at trust boundaries and keep shared domain types consistent with Convex validators.

## Data and Authentication

Treat Convex as the source of truth for application data, profiles, and permissions. When authentication is selected, use Clerk for identity and sessions; enforce authorization in Convex functions as well as the UI. Keep secrets on the server and out of source control.

## Code Placement

Place app-specific screens, navigation, providers, and reusable UI in the application source directory. Keep backend functions and schemas in convex/. Reuse domain types and business logic within the project.

## Naming and Implementation

Use kebab-case for project, app, file, and directory names. Follow the selected platform conventions for required framework filenames. Implement only the specified features. Use accessible controls, keyboard navigation where supported, and clear loading and error states. Surface failures without silently discarding user data.

## Verification

Complete the checklist in order and mark items done only after verifying their behavior. Run strict type checking and production builds. Document required environment variables and local setup instructions in the project README.
