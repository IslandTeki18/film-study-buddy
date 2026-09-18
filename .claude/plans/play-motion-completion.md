# Play Motion — completion report

Implemented on `main`. The supplied plan and handoff directory remain untracked and were excluded from commits.

| Step | Commit | Verification |
| --- | --- | --- |
| Data model | `a8861c2` | `npm run typecheck`; `npx convex dev --once` passed. |
| Renderer | `e05c605` | `npm run typecheck` passed. |
| Designer | `fe29b8d` | `npm run typecheck` passed. |
| Documentation | This report's commit | `npm run build`; `git diff --check` passed. |

## Runtime checks

An Electron/CDP check used a temporary diagram in the existing Timpview Source Game. The diagram
was soft-deleted after each run. The script is `/tmp/play-motion-ui.mjs` and is outside the repo.

| Check | Result |
| --- | --- |
| V1 | Partial: Gun Trips shows the Motion button. OL, defense selection, and Escape were not checked. |
| V2 | Partial: setting motion creates the ghost and changes the button; player drag leaves the ghost and produces an arrowed path. Exact line geometry and screenshot were not checked. |
| V3 | Partial: ghost drag updates only the motion spot and preserves its owner. Snap, clamp, and selection were not checked. |
| V4 | Passed: motion ghost persists after page reload. |
| V5 | Partial: player drag leaves the ghost. Keyboard nudge and route translation were not checked. |
| V6 | Partial: remove motion clears the ghost; remove man and reset were not checked. |
| V7 | Partial: a saved custom formation restored the ghost after switching formations and after reload. A pre-existing custom formation was not checked. |
| V8 | Partial: defense view fades the motion group to 0.28; pointer blocking, hide side, gallery, Play Detail, report, and PDF were not checked. |
| V9 | Partial: selected line opacity is 1. Unselected line opacity was not checked. |

`npm run build` passed, including TypeScript, all 15 existing tests, and Electron/Vite compilation.
No screenshots were captured. A legacy diagram visual comparison was not performed. The temporary
custom formation was deleted after verification.

## Decisions and limits

- Motion is stored on each player in normalized coordinates. This follows the existing route and
  zone model and lets diagram saves, report snapshots, and custom formations carry it without new
  migration code.
- The renderer uses theme colors, so its dark-theme motion line is slightly dimmer than the literal
  handoff color. The existing route color is reused.
- The ghost is pointer-draggable, like zones; keyboard movement of the ghost is not implemented.
- The remaining V1–V3 and V5–V9 checks above should be run before treating those acceptance
  criteria as verified, especially custom formation restoration and PDF rendering.
