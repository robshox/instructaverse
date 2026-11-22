---
feature: Switch Dimension redesign
slug: switch-dimension-redesign
created: 2026-11-22
spec: molten-docs/loop/switch-dimension-redesign/03-spec.md
verdict: partial
molten_next_skill: mt-review
---

# Verification — Switch Dimension redesign

Run in auto mode (see `auto.md`). Evidence comes from the test suite, the standalone build served on :3917 with the demo data, a throwaway empty instance (setup, brand override), and the Docker image. Browser checks used agent-browser (Chromium). Third-party keys are placeholders, so anything needing real Stripe or Mux is listed under Not verified.

## Automated checks
| Check | Command | Result |
| --- | --- | --- |
| Tests | `npx vitest run` | 191 passed in 40 files (152 tests before the redesign, all still passing) |
| Type-check | `npm run typecheck` (`next typegen && tsc --noEmit`) | clean |
| Lint | `npm run lint` | clean |
| Build | `npm run build` | compiled successfully |
| Docker | `docker build -t instructaverse:redesign-check .` then run | builds and serves; runtime `BRAND_NAME` shows in titles, and the self-hosted font files return 200. Built at Checkpoint 4, before the logo fallback fix in f38fada |
| Secrets | `gitleaks git --log-opts=feat/SWI-198-community-platform-v1..HEAD` | no leaks (Checkpoint 4) |

## Acceptance criteria
| AC | Verdict | Evidence |
| --- | --- | --- |
| AC-1 | pass | A sweep of 8 member pages and 7 admin pages computed every element's `font-family`: only Inter Tight and IBM Plex Mono, 0 elements with Arial |
| AC-2 | pass | Same sweep: body background `rgb(11, 11, 11)` everywhere. The Resume lesson primary button is `rgb(255, 85, 0)` with `rgb(11, 11, 11)` text |
| AC-3 | pass | Defaults: titles end "· Switch Dimension Accelerator" and the logo loads (536 px natural width). Docker and standalone runs with `BRAND_NAME=Docker Check` / `Acme Academy` and a custom `BRAND_LOGO_URL` used those values (e.g. "Set up your community · Acme Academy"). `brand.test.ts` covers defaults and overrides. No "Create Next App" title anywhere |
| AC-4 | pass | Computed contrast: fg ≥ 17.8:1, muted ≥ 6.4:1, dim 4.98 / 4.74 / 4.50:1 on canvas / surface / raised, accent ≥ 5.5:1, on-accent on accent 6.1:1. All ≥ 4.5:1 (dim raised from #5f5f5f, decision 16) |
| AC-5 | pass | Member sweep: the nav shows the correct `aria-current` (Courses, Board, Events) on each page. /account shows the nav with Account as the active pill |
| AC-6 | pass | The content column measured 1120 px on every member page, including the empty-ish ones (events with one item, no-access panel) |
| AC-7 | pass | Admin sweep: the sidebar's `aria-current` matched each section on all 7 admin pages. A signed-in member opening /admin/courses gets "404: This page could not be found." |
| AC-8 | pass | `learning.test.ts` totals. Browser: tester sees "Welcome back, Test." and "✓ 0 of 3", then "1 of 3" after marking a lesson complete |
| AC-9 | pass | `learning.test.ts` (most recent course rule). Browser: after completing l1, Continue showed "Module 01 · Lesson 2, Setting up your environment" and Resume linked to it |
| AC-10 | pass | `learning.test.ts`: no completions gives the first lesson of the first course; everything complete gives null (decision 17 fallback covered). Browser: an empty account showed no Continue card and no totals |
| AC-11 | pass | `learning.test.ts`. Browser: course card "2 modules · 3 lessons", "Not started" then a progress bar after completion |
| AC-12 | pass | `home.test.ts` (soonest visible event; newest post only from visible boards; null otherwise). Browser: tester sees both panels, and the outsider (no access) sees neither |
| AC-13 | pass | Browser: Getting started went from "0 / 2 complete" to "1 / 2 complete", rows showed done ✓ then UP NEXT, and the progress card's Next up matched the home Continue lesson |
| AC-14 | pass | `lesson-view.test.ts` (crosses modules, null on last). Browser: l2 (last in module 1) shows Next lesson; l3 (last lesson) shows none |
| AC-15 | pass | Browser: the l1 sidebar lists both modules' lessons with ✓ states, the current lesson has `aria-current=page` and the accent bar, and progress shows 1 / 3 |
| AC-16 | pass | `lesson-view.test.ts` (`vttCues`: mm:ss, minutes over 59, tags stripped, CRLF). Browser: l1 shows "00:00 / 00:03" cues and l2 shows its plain text |
| AC-17 | partial | Browser: Mark complete toggles both ways and persists; an unknown lesson returns 404; the outsider gets the no-access panel; the captions route and signed playback have existing tests. **Not verified:** real Mux playback (placeholder keys, SWI-231) |
| AC-18 | pass | `board-sidebar.test.ts` (visible boards only, counts). Browser: the sidebar showed "General 2", then 1 after deleting a post, and the current board is highlighted |
| AC-19 | pass | `board-sidebar.test.ts` (author role). Browser as admin: HOST tag on the admin's post; pin gives PINNED and the gold border; like, reply, edit ("· edited") and delete all worked |
| AC-20 | pass | `days.test.ts` (calendar days in zone, TODAY). Browser: "DEC 03 THU", "IN 11 DAYS", "5:00 – 6:00 PM GMT"; the past list has no Join |
| AC-21 | pass | `ics.test.ts` (UTC times, +2h with no end, escaping, folding, null without access). Browser fetch as tester: 200 `text/calendar`, attachment, correct DTSTART/DTEND/SUMMARY/DESCRIPTION/URL. Outsider and anonymous: 404 |
| AC-22 | partial | Browser with a temporary local purchase: card with plan, ● ACTIVE tag, Renews / Since / Groups. Empty account: "No membership yet" plus See plans. The password form saves. **Not verified:** price (needs Stripe) and the Manage billing portal redirect (needs Stripe; the route has existing tests) |
| AC-23 | partial | `copy.test.ts` (summary and bullets, price split). Browser: plans in order as Path A / Path B; the Join form still POSTs to /pricing/checkout. **Not verified:** the Stripe price display (placeholder keys) |
| AC-24 | pass | Browser: a magic link from the new prompt field arrived in Mailpit and signed in; password sign-in worked; the throttle message showed on the 6th failed attempt; reset request → email → new password → `/login?reset=1`, and the new password signs in; /setup renders on an empty instance |
| AC-25 | pass (UI) | Browser: while waiting, steps show "✓ payment received / > granting access" with the button disabled. With the status poll stubbed to `{ready:true}`: three ✓ steps, button enabled, no "@" anywhere on the page. The real webhook path needs Stripe (SWI-230) |
| AC-26 | partial | Browser: the outsider on Founders Workshop sees only Lifetime (the only listed plan granting Founders). **Not verified:** the price beside it (Stripe) |
| AC-27 | pass | `admin-summary.test.ts` (module and lesson counts; ready, processing, error, none). Browser: table rows show modules, tags or "Admins only", lessons, and "— no videos" |
| AC-28 | pass | Browser, saved after reload each time: lesson drag within its module, module drag by handle, board drag, and the ↑/↓ buttons for lessons, modules and boards (demo order restored afterwards) |
| AC-29 | pass | `reorder.test.ts` (other module or course IDs, partial, duplicate, unknown: refused, order unchanged). `admin-guards.test.ts`: a non-admin is refused and the order is unchanged; a stale list from an admin returns an error and isn't saved |
| AC-30 | pass | Browser: typed into the editor, switched to Preview (rendered with `.prose-content`, the members' Markdown component), reloaded, and the text was not saved |
| AC-31 | pass | `listing.test.ts`; `admin-guards.test.ts` (non-admin refused, plan unchanged). Browser: both switches off showed "Membership isn't open right now" on /pricing; Lifetime on showed only Lifetime; both on showed both |
| AC-32 | pass | `usage.test.ts`. Browser: Pro members "1 course · 1 board · 2 events", granted by "Lifetime, Monthly"; Founders "1 course", granted by Lifetime |
| AC-33 | pass | Browser per screen: course create, details save, add/rename/delete module and lesson, lesson save and attach, plan edit and save, group create/rename/delete, board create/edit/delete, event edit and save. Existing action tests still green |
| AC-34 | pass | 191 tests green (152 existing plus new tests for every new function); lint, typecheck and build clean |

## Edge cases & error states tried
- A member with no courses: greeting plus an empty state with See plans; no totals, Continue or sidebar panels.
- A course with no lessons: a temporary course with one empty module showed "0 / 0 complete" and "No lessons yet", with no progress card, Resume or errors. The course was then deleted.
- An event with no end: `.ics` uses start + 2h (test); the past list shows "2 h".
- A plan with no Stripe price: no price is shown, which is every plan in the demo.
- A stale drag reorder: refused with "That order doesn't match the current items. Reload and try again." (test); the list snaps back.
- A broken logo URL: showed a broken-image icon. **Fixed**: the brand name now shows as text (see below).
- Login throttle, an expired reset link message, an upload with placeholder Mux keys ("Couldn't start the upload. Check the Mux settings."), the after-checkout slow state (no sign-in button shown).
- No console page errors on any member or admin page. The only third-party request is the configured logo host.

## Failures found and fixed (cause → fix → regression test)
- **Broken logo showed an icon, not the name.** Cause: a plain `<img>` with alt text, so browsers draw the broken-image glyph. Fix: the `LogoImage` client component swaps to the name on `error`, including errors before hydration (f38fada). Guard: browser check on a throwaway instance with `BRAND_LOGO_URL=http://localhost:9/missing-logo.png` shows "Acme Academy" as text; the demo logo still loads. There's no unit test, because the project has no DOM test environment.
- **Not a product bug, recorded for honesty:** my first sweep ran against the demo server after a rebuild without a restart. Its old pages pointed at stylesheets the rebuild had replaced, so everything rendered unstyled. Restarting fixed it. Standalone deploys restart on release, so this only affects local hot rebuilds.

## Not verified (and why)
- Stripe prices on pricing, no-access and account, the Manage billing portal, and the real checkout webhook to the ready state (AC-22, AC-23, AC-25, AC-26): placeholder Stripe keys. Already deferred as SWI-230 (Stripe test mode).
- Real Mux playback, captions over a live video, and a real upload (AC-17, drop zone): placeholder Mux keys. Already deferred as SWI-231 (Mux live check).
- Docker image after f38fada: the image was built and run at Checkpoint 4. The only later change is the client logo fallback; mt-ship re-runs the build.

## Verdict
**partial, environment only.** Every acceptance criterion that can be exercised without real Stripe or Mux credentials passes, with tests and browser evidence. The gaps above all need those credentials and are already tracked as SWI-230 and SWI-231. One in-scope failure (broken logo fallback) was found and fixed. Next: **mt-review**.
