---
feature: Switch Dimension redesign
slug: switch-dimension-redesign
created: 2026-11-22
status: running
started_at: mt-discovery
stop_after: mt-ship
push: true
max_fix_attempts: 3
max_loop_backs: 2
loop_backs: 0
pr: null
---

# Auto — Switch Dimension redesign

## Brief
From Rob via Engineering (orca handoff msg_46bf77b98cfc, 2026-11-22), unedited:

> "there should be an mt-auto in the skill setup so i dont need to type mt-spec myself you can proceed it for me".
>
> So please run mt-auto for the Switch Dimension redesign now. Inputs:
> - Design reference: the 17 approved frames on Doop page "Redesign — Switch Dimension style" (canvas 5scx7SJUTV) and its guideline doc.
> - Context: the app as built, and molten-docs/loop/community-platform-v1/03-spec.md.
> - Loop folder: molten-docs/loop/switch-dimension-redesign/.
> - Open decisions to settle and log in auto.md: how far to build the frame extras (home dashboard, sidebars, house rules, counts, drag reorder) and the Arial-over-Geist font fix. Use your recommendation; prefer simple builds over cutting.
>
> Finish with a PR link and the list of hand checks for Rob.

Earlier in the terminal, Rob approved the Doop redesign ("You did a good job I had not seen the extra screens") and chose to do the redesign before Phase 5 ("Do redesign first").

## Run log
| # | Step | Result | Next |
| --- | --- | --- | --- |
| 1 | mt-discovery | 01-discovery.md written; next mt-spec (no prototype: the risk is scope, not feasibility) | mt-spec |
| 2 | mt-spec | 03-spec.md approved by auto: 10 FR groups, 34 ACs, no schema changes | mt-plan |
| 3 | mt-plan | 04-plan.md approved by auto: 4 phases, 19 tasks; Linear parent SWI-244 with SWI-245–SWI-263 (blocked-by links set) | mt-build |
| 4 | mt-build phase 1 | Checkpoint 1 passed: SWI-245–248 done (2df8ebf, e2235e6, 95a6a59, aaec560), 156 tests green | mt-build phase 2 |

## Decisions made for you
| # | Step | Question | Chose | Why | Undo cost | By |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | mt-auto | How far should the run go? | Open a PR (stop_after: mt-ship, push: true) | The brief asks to finish with a PR link | low | auto |
| 2 | mt-auto | Which branch and PR base? | Branch `feat/switch-dimension-redesign` off `feat/SWI-198-community-platform-v1`; PR targets that branch (stacked) | The app code the redesign restyles isn't merged to main yet; a stacked PR keeps the redesign reviewable on its own | low | auto |
| 3 | mt-auto | Fresh subagent per step? | Run the steps in this session | This host only spawns subagents when the user explicitly asks; the docs carry state between steps, which mt-auto allows | low | auto |
| 16 | mt-build 1.1 | Dim text colour | #808080 instead of the site's #5f5f5f | #5f5f5f is 2.8–3.1:1 on the dark surfaces; AC-4 needs 4.5:1 | low | auto |
| 17 | mt-build 2.1 | Next lesson when the most recent course is finished | The first course, in course order, with a lesson left | The spec covered only the recent course and the no-completions cases; this keeps "Continue" useful until everything is done (AC-10) | low | auto |
| 18 | mt-build 2.3 | The frame shows untouched modules collapsed; how to build that? | Native `<details>` per module: open when it has a completion or holds the next lesson (all open once the course is done); the progress card says "Start course" before any completion | No JavaScript, keyboard accessible, every lesson still one click away | low | auto |
| 19 | mt-build 2.6 | Calendar route path, and the frame's "Join link opens 15 min before" | `GET /api/events/[id]/calendar` (next to the other member API routes, the spec allowed "or similar"); Join on Zoom stays on every upcoming event as today, the 15-minute rule is not built | A timed Join gate would change existing behaviour and isn't in the spec | low | auto |
| 4 | mt-discovery | Font fix | Inter Tight + IBM Plex Mono via next/font; drop the Arial override and Geist | Matches the approved style and fixes the Arial bug | low | auto |
| 5 | mt-discovery | Hard-code Switch Dimension branding? | No: env-configurable brand (BRAND_NAME, BRAND_LOGO_URL, BRAND_TAGLINE) defaulting to Switch Dimension | The app is open source; other installs need their own brand | low | auto |
| 6 | mt-discovery | Light mode? | Dark only | The approved style is dark; one theme is simpler | low | auto |
| 7 | mt-discovery | How far to build the frame extras? | Build all that real data supports: home dashboard, lesson outline, board list sidebar, counts, drag reorder, .ics, Preview tab, plan list toggle | Brief: prefer simple builds over cutting | medium | auto |
| 8 | mt-discovery | House rules card? | Cut | No data field; hard-coding one community's rules into an open-source app is wrong; revisit with the settings page | low | auto |
| 9 | mt-discovery | Streak, time left, durations, course type labels, masked email | Cut | No data source (or deliberately private) | low | auto |
| 10 | mt-discovery | Icons from the Iconify CDN like the frames? | Inline SVG icons (Lucide paths) | Self-hosted and offline-friendly; no third-party requests from members' browsers | low | auto |
| 11 | mt-spec | Rule for "next incomplete lesson" | First incomplete lesson, in outline order, of the course most recently progressed; otherwise the first course's first lesson | Deterministic and testable from existing data | low | auto |
| 12 | mt-spec | Where does pricing hero copy come from? | The brand tagline (env) plus the plan descriptions; extra description lines become bullets | No invented copy; works for any install | low | auto |
| 14 | mt-plan | Linear parent for the redesign | New parent SWI-244 "Switch Dimension redesign" in project Instructaverse, tasks titled "RD n.n …" | config.md has tracker_sync: true; a separate parent keeps it apart from SWI-198 | low | auto |
| 15 | mt-plan | Move /account under (member)? | Yes, the route folder moves whole | Gives /account the member nav (AC-5) without a duplicate nav | low | auto |
| 13 | mt-spec | Calendar format | Single-event .ics download, with the same access check as the events page | Simplest standard way to add to any calendar | low | auto |

## Stops
