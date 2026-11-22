---
feature: Switch Dimension redesign
slug: switch-dimension-redesign
created: 2026-11-22
molten_next_skill: mt-spec
---

# Discovery — Switch Dimension redesign

*Written in auto mode from the brief in `auto.md`, the approved Doop frames, the parent spec and the code. No interview; open points are under Assumptions with defaults.*

## Problem
The app works, but it looks like an unstyled starter: light zinc greys, Arial (the starter `globals.css` overrides the Geist font it loads), page columns that shrink to their content, no brand, "Create Next App" page titles, no nav on /account, and dense admin forms with ↑/↓ buttons and checkbox confirms. It doesn't look like Switch Dimension, whose members it's built for, and it's harder to use than it needs to be.

## Users & context
- **Members** (Switch Dimension learners): courses, lessons, board, events, account.
- **Visitors**: pricing, sign in, the after-checkout page.
- **Admins** (Rob): course, board, event, plan and group management.
- Rob designed and approved the target look on Doop canvas `5scx7SJUTV`, page "Redesign — Switch Dimension style" (17 frames), with the binding style in the guideline doc `redesign-instructaverse-app`. He approved the frames including their improvements, and chose to do this before Phase 5.

## Desired outcome / success signals
- Every existing screen matches its approved frame in look and layout: dark console style, Inter Tight plus IBM Plex Mono, one orange accent, pill CTAs, the Member Nav and the admin sidebar shell.
- The frame improvements work with real data (not decoration), built simply.
- All existing behaviour and tests keep working: the 152 tests stay green, plus new ones for any new logic.
- Rob can click through the demo and see the redesign on every screen.

## Key flows
Unchanged flows, restyled: sign in, buy, finish checkout, browse courses, watch a lesson and mark it complete, post/comment/like, join an event, manage account and billing, and all admin CRUD.
New, small flows from the frames:
1. **Home** shows "continue where you left off" (next incomplete lesson), course progress, the next event and the latest board post.
2. **Lesson** shows a course outline beside the video and a "Next lesson" button.
3. **Admin** reorders lessons by drag-and-drop (keyboard ↑/↓ kept for accessibility).
4. **Event** "Add to calendar" downloads an .ics file.
5. **Lesson editor** has a Markdown Preview tab.

Most likely failure: a restyle quietly drops a working control (e.g. a delete confirm or the image upload), or a page breaks for a state the frame didn't show (empty lists, no video, no purchases).

## Constraints
- Next.js 16.4.6 App Router with Cache Components, Tailwind CSS v4, TypeScript. Read `node_modules/next/dist/docs/` before using framework APIs (AGENTS.md).
- Fonts via `next/font/google` (self-hosted at build). The Docker build needs network access at build time, as it already does for npm.
- No new runtime dependencies beyond what's needed. Icons: use inline SVG or a small icon set; don't hotlink Iconify at runtime (privacy, offline self-hosting).
- Open source, MIT, self-hosted: Switch Dimension branding must be configurable, not hard-coded (other installs aren't Switch Dimension).
- Server actions stay guarded (`requireAdmin`, `getViewer`). Every gate and validation stays exactly as it is.

## Out of scope
- New product features beyond the frames' small improvements listed above.
- Phase 5–7 work (migration, API, members and settings pages, README).
- A light theme (the redesign is dark-only).
- Streaks, "time left" and lesson durations (no data source; see Assumptions).

## Codebase context (files, patterns, services to reuse)
- Root: `src/app/layout.tsx` (fonts, metadata), `src/app/globals.css` (Tailwind import, starter tokens, Arial override, `.prose-content`).
- Shared UI: `src/components/form.tsx` (Field, SubmitButton, FormMessage, inputClass), `markdown.tsx`, `no-access.tsx`, `post-card.tsx`, `like-button.tsx`, `complete-button.tsx`, `lesson-player.tsx`, `local-time.tsx`.
- Layouts: `src/app/(member)/layout.tsx` (member nav), `src/app/admin/layout.tsx` (admin nav and gate). `/account` sits outside `(member)`.
- Data for the extras already exists: `listCoursesFor`, `getCourseOutline`, `completedLessonIds`, `courseProgress`, `listEventsFor`, `listPosts`, `listComments`, `likeSummary`, `listPlans`, `getPriceLabel`, `listGroups`, purchases, and positions on modules, lessons and boards.
- Tests are lib-level Vitest (152). UI is verified in the browser against the standalone build.

## Facts / Assumptions / Open questions
**Facts**
- Rob approved the 17 frames, improvements included (terminal, 2026-11-22).
- The brief says to prefer simple builds over cutting the extras.
- The app renders Arial because `globals.css` sets `body { font-family: Arial }`.

**Assumptions (auto defaults, all logged in auto.md)**
- **A1. Font fix:** drop the Arial override and Geist; load Inter Tight and IBM Plex Mono with `next/font/google` and expose them as Tailwind `--font-sans` / `--font-mono`.
- **A2. Branding is configurable:** a small `brand` module reads `BRAND_NAME`, `BRAND_LOGO_URL` and `BRAND_TAGLINE` env vars, defaulting to the Switch Dimension values (name "Switch Dimension Accelerator", logo `https://switchdimension.com/site/logo.png`). Page titles use it. This moves to the Phase 6 settings page later.
- **A3. Dark only:** a single dark theme (no light mode, no prefers-color-scheme switch).
- **A4. Extras, built simply from data that exists:**
  - Home dashboard: built (continue card, totals, course cards with module/lesson counts and %, next event, latest post).
  - Lesson outline sidebar and Next lesson: built.
  - Board sidebar board list with post counts: built. **House rules card: cut.** There's no field for it, and hard-coding Switch Dimension's rules into an open-source app is wrong; revisit with the settings page.
  - Counts (lessons, modules, posts, buyers, group usage): built from queries.
  - Drag reorder: built for lessons, modules and boards with native drag-and-drop, keeping ↑/↓ buttons for keyboards.
  - Event Add to calendar: built (.ics route with the same access check). "Join link opens 15 min before": cut (not a real behaviour).
  - Lesson editor Preview tab: built (client-side render with the existing Markdown component).
  - Plan listed/unlisted toggle: built as a small action.
- **A5. No data, so cut:** the streak line, "12:40 left", lesson durations, course type labels ("Self-paced course"), the masked email on the after-checkout page (we deliberately never send the buyer's email to the browser), and invented copy (pricing hero text comes from the brand tagline; plan bullets come from extra lines in the plan description).
- **A6. Icons:** a small set of inline SVG icons (Lucide paths, ISC licence) in one component, so nothing loads from a CDN at runtime.

**Open questions:** none blocking; Rob reviews the decisions in the PR.

## Riskiest unknown
**Scope and regressions across ~33 UI files**: a restyle silently dropping a working control or breaking an unshown state (empty, no video, no purchase). Mitigation: keep every server action and gate as is, restyle in vertical slices per area, and browser-check each area against its frame and its empty states. Not a technical-feasibility risk, so no prototype.

## Recommended next step
**mt-spec**: turn the frames and these defaults into acceptance criteria per screen.
