---
feature: Switch Dimension redesign
slug: switch-dimension-redesign
created: 2026-11-22
spec: molten-docs/loop/switch-dimension-redesign/03-spec.md
status: approved
approved_by: auto
issue_tracker: linear
tracker_parent: https://linear.app/switch-dimension/issue/SWI-244
molten_next_skill: mt-build
---

# Plan — Switch Dimension redesign

## Approach
Foundations first: tokens, fonts, brand, shared UI primitives and both layouts, so every later screen task only composes them. Then member screens (the most-used surface), public screens, and admin screens, each as vertical slices. A slice adds any small data function it needs, with tests, and restyles its page(s) against the approved Doop frame. No schema changes. Every existing server action and gate stays as is; tasks only change markup and styles, plus the new read and reorder functions.

## Architecture decisions
- **AD-1 Tokens in Tailwind v4 theme:** `globals.css` declares the palette and fonts in `@theme` (e.g. `--color-bg`, `--color-surface`, `--color-raised`, `--color-line`, `--color-line-2`, `--color-muted`, `--color-dim`, `--color-accent`, `--color-on-accent`, `--color-ok`, `--color-danger`, `--color-warn`, `--font-sans`, `--font-mono`), so pages use `bg-surface`, `text-muted`, `border-line`, `font-mono` and so on.
- **AD-2 Fonts:** `next/font/google` Inter_Tight (400/500/600) and IBM_Plex_Mono (400/500), bound to `--font-sans` and `--font-mono`. Remove Geist and the Arial override.
- **AD-3 Brand:** `src/lib/brand.ts` reads `BRAND_NAME`, `BRAND_LOGO_URL` and `BRAND_TAGLINE` (optional, not in the required env schema) with Switch Dimension defaults. The root `metadata` uses a title template `%s · <name>`.
- **AD-4 UI primitives:** `src/components/ui.tsx` (Pill button/link variants, Card, Eyebrow, Tag, Chip, ProgressBar, DateBlock, Avatar) and `src/components/icon.tsx` (inline Lucide paths). `form.tsx` keeps its API (Field, SubmitButton, FormMessage, inputClass) but is restyled, so existing forms change with no logic edits.
- **AD-5 Layouts:** the member layout renders `MemberNav` (client component for the active link via `usePathname`). `/account` moves under `(member)`. The admin layout becomes a sidebar shell (`AdminSidebar` client component for the active state); the gate is unchanged. A `PublicHeader` is used by pricing, login, reset, setup and success.
- **AD-6 Reorder:** `src/lib/reorder.ts` with `reorderLessons(moduleId, ids)`, `reorderModules(courseId, ids)` and `reorderBoards(ids)`. Each validates that the IDs exactly equal the current set, then rewrites positions in one transaction. A client `SortableList` uses native HTML5 drag-and-drop and keeps ↑/↓ buttons (existing actions).
- **AD-7 No new runtime dependencies.**

## Dependencies & setup (packages, migrations, env vars)
- Packages: none new (next/font is built in).
- Migrations: none.
- Env vars: optional `BRAND_NAME`, `BRAND_LOGO_URL`, `BRAND_TAGLINE`.
- Database branch: no. No schema changes; SQLite is local.

> Tasks live in Linear under [SWI-244](https://linear.app/switch-dimension/issue/SWI-244). This plan links to them and never tracks their status.

## Phase 1 — Foundations
- [SWI-245](https://linear.app/switch-dimension/issue/SWI-245) 1.1 Design tokens, fonts and configurable brand · wave 1
- [SWI-246](https://linear.app/switch-dimension/issue/SWI-246) 1.2 Shared UI primitives and icons; restyle form controls and Markdown · wave 2
- [SWI-247](https://linear.app/switch-dimension/issue/SWI-247) 1.3 Member nav, member layout (incl. /account) and public header · wave 3
- [SWI-248](https://linear.app/switch-dimension/issue/SWI-248) 1.4 Admin sidebar shell · wave 3
- **Checkpoint 1:** tests green; build; every page renders dark in the new fonts with the right nav or shell.

## Phase 2 — Member screens
- [SWI-249](https://linear.app/switch-dimension/issue/SWI-249) 2.1 Learning progress queries: totals, module counts, next incomplete lesson · wave 4
- [SWI-250](https://linear.app/switch-dimension/issue/SWI-250) 2.2 Member home dashboard · wave 5
- [SWI-251](https://linear.app/switch-dimension/issue/SWI-251) 2.3 Course outline page · wave 5
- [SWI-252](https://linear.app/switch-dimension/issue/SWI-252) 2.4 Lesson page with outline sidebar, Next lesson and timestamped transcript · wave 6
- [SWI-253](https://linear.app/switch-dimension/issue/SWI-253) 2.5 Board page, post card and board sidebar with counts · wave 6
- [SWI-254](https://linear.app/switch-dimension/issue/SWI-254) 2.6 Events page and Add to calendar (.ics) · wave 7
- [SWI-255](https://linear.app/switch-dimension/issue/SWI-255) 2.7 Account page · wave 7
- **Checkpoint 2:** tests green; every member screen matches its frame; empty states checked.

## Phase 3 — Public screens
- [SWI-256](https://linear.app/switch-dimension/issue/SWI-256) 3.1 Pricing page and no-access panel · wave 8
- [SWI-257](https://linear.app/switch-dimension/issue/SWI-257) 3.2 Sign-in, reset, setup and after-checkout · wave 9
- **Checkpoint 3:** tests green; public screens match their frames.

## Phase 4 — Admin screens
- [SWI-258](https://linear.app/switch-dimension/issue/SWI-258) 4.1 Reorder functions and SortableList · wave 10
- [SWI-259](https://linear.app/switch-dimension/issue/SWI-259) 4.2 Admin courses table and course editor · wave 11
- [SWI-260](https://linear.app/switch-dimension/issue/SWI-260) 4.3 Lesson editor: Preview tab, WebVTT tag, drop zone · wave 12
- [SWI-261](https://linear.app/switch-dimension/issue/SWI-261) 4.4 Plans cards and listed toggle · wave 10
- [SWI-262](https://linear.app/switch-dimension/issue/SWI-262) 4.5 Groups table with usage · wave 11
- [SWI-263](https://linear.app/switch-dimension/issue/SWI-263) 4.6 Admin boards (drag reorder) and admin events · wave 12
- **Checkpoint 4:** full suite, lint, typecheck and build; every admin screen matches its frame; then mt-verify.

## Parallel waves
| Wave | Tasks | Can start when |
| --- | --- | --- |
| 1 | 1.1 (SWI-245) | Plan approved |
| 2 | 1.2 (SWI-246) | 1.1 done |
| 3 | 1.3 (SWI-247), 1.4 (SWI-248) | 1.2 done |
| 4 | 2.1 (SWI-249) | Checkpoint 1 passed |
| 5 | 2.2 (SWI-250), 2.3 (SWI-251) | 2.1 done |
| 6 | 2.4 (SWI-252), 2.5 (SWI-253) | 2.1 done (2.5 (SWI-253) is independent of 2.1 (SWI-249), but serialised to keep the shared progress files out of merges) |
| 7 | 2.6 (SWI-254), 2.7 (SWI-255) | Checkpoint 1 passed / 1.3 done |
| 8 | 3.1 (SWI-256) | Checkpoint 2 passed |
| 9 | 3.2 (SWI-257) | Checkpoint 2 passed |
| 10 | 4.1 (SWI-258), 4.4 (SWI-261) | Checkpoint 3 passed |
| 11 | 4.2 (SWI-259), 4.5 (SWI-262) | 4.1 done / Checkpoint 3 passed |
| 12 | 4.3 (SWI-260), 4.6 (SWI-263) | 4.2 done / 4.1 done |

This runs as a single agent in order; the waves show what could run in parallel.

## Risks & mitigations
- **A restyle drops a working control.** Every task keeps server actions and form field names; the existing tests cover the logic; each task's browser check exercises every control on its page.
- **Tailwind v4 theme naming collisions with defaults.** Use distinct token names (surface, raised, line, muted, dim, accent, ok, danger, warn) and check them in 1.1.
- **next/font at Docker build time.** The Docker build already has network for npm; check `docker build` at Checkpoint 4 / mt-verify.
- **Native drag-and-drop accessibility.** Keep the ↑/↓ buttons as the keyboard path (AC-28).
- **Moving /account under (member)** could break `/account/billing`. Move the route folder as a whole and browser-check billing (1.3).

## Noticed during build
File findings as issues under the parent (Linear).

## Definition of done (all acceptance criteria verified, with AC → task coverage)
| AC | Task(s) | AC | Task(s) |
| --- | --- | --- | --- |
| AC-1 | 1.1 | AC-18 | 2.5 |
| AC-2 | 1.1, 1.2 | AC-19 | 2.5 |
| AC-3 | 1.1 | AC-20 | 2.6 |
| AC-4 | 1.1, 1.2 | AC-21 | 2.6 |
| AC-5 | 1.3 | AC-22 | 2.7 |
| AC-6 | 1.3 | AC-23 | 3.1 |
| AC-7 | 1.4 | AC-24 | 3.2 |
| AC-8 | 2.1, 2.2 | AC-25 | 3.2 |
| AC-9 | 2.1, 2.2 | AC-26 | 3.1 |
| AC-10 | 2.1, 2.2 | AC-27 | 4.2 |
| AC-11 | 2.1, 2.2 | AC-28 | 4.1, 4.2, 4.6 |
| AC-12 | 2.2 | AC-29 | 4.1 |
| AC-13 | 2.1, 2.3 | AC-30 | 4.3 |
| AC-14 | 2.4 | AC-31 | 4.4 |
| AC-15 | 2.4 | AC-32 | 4.5 |
| AC-16 | 2.4 | AC-33 | 4.2–4.6 |
| AC-17 | 2.4 | AC-34 | all (Checkpoint 4) |

Done means every AC is verified with evidence by mt-verify, all checkpoints pass, and the build and Docker image are clean.
