---
feature: Switch Dimension redesign
slug: switch-dimension-redesign
created: 2026-11-22
sources: [session, plan, verify, review, ship, git]
---

# Retro — Switch Dimension redesign

## Went well (keep doing)
- Foundations first (tokens, primitives, layouts) made every later screen a short task; 19 tasks landed as 19 commits with no re-splits.
- Testing new read and reorder logic before building each screen caught design questions early (for example the "next lesson when the recent course is finished" rule, decision 17).
- Browser-checking each screen against its Doop frame, including empty states, found real defects before review: the board composer gap, the pin alignment, and the editor buttons stretching to full width.

## Could have gone better (what happened, evidence)
- **Stale demo server after rebuilds.** Twice, `npm run build` replaced `.next/static` under the running standalone demo, so its pages lost their CSS. The verify sweep's first pass measured unstyled login pages (05-verify, "Failures found and fixed"). Rob's demo was broken until a restart.
- **Demo data changed by testing.** A magic-link check on tester@example.com removed that account's password, a Better Auth quirk for unverified accounts. It was only noticed when a later sign-in failed, and was restored through the reset flow (now SWI-272).
- **Posted a guessed commit SHA to Linear again.** The SWI-256 comment was sent in parallel with the commit and named a SHA that didn't exist (corrected in a follow-up comment). The same mistake happened in the platform build.
- **Layout bug only a visual check caught.** The course editor's menus were clipped by an `overflow-hidden` card (review blocker). The build check used JavaScript to open the menus, so the clipping went unseen until review screenshotted it.
- **Formatter guesswork.** The project has no Prettier config; a default `npx prettier` run rewrapped a whole file, and the matching width (160) had to be rediscovered.

## Suggested improvements
| # | Category | Change | Where | Effort | Apply? |
| --- | --- | --- | --- | --- | --- |
| 1 | Checks | Add a `.prettierrc` with `printWidth: 160` (matches the existing code exactly) and a `format:check` script, so agents and humans format the same way | repo root, `package.json` | S | pending |
| 2 | Information access | Make the local demo script rebuild and restart in one step (build, copy static, restart), and give tests their own seed accounts marked `emailVerified`, so checks never break the demo users | scratch `serve.sh`/`restart.sh`; a `scripts/demo` in the repo | S | pending |
| 3 | Standards | Coding standard for **mt-review**: no `overflow-hidden` on containers that hold absolute popovers or menus; check menus visually by clicking, not by setting `open` from script | `AGENTS.md` (one line) | S | pending |
| 4 | Navigation | One line in `AGENTS.md`: tracker comments that name a commit are written only after the commit command returns its SHA | `AGENTS.md` | S | pending |
| 5 | Checks | Add a minimal DOM test setup (jsdom + Testing Library) so client components like the lesson Preview tab and SortableList get automated tests | `vitest.config.mts` | M | pending |

## Feedback for Molten skills (if any)
- **mt-auto / mt-review:** on hosts where subagents need an explicit user request, the review is always single-context. mt-auto's kickoff could ask once ("may reviewers run as subagents?") so the review can be fresh-context.
- **mt-ship:** the readiness check wants verify `pass`, but mt-auto routes an environment-only `partial` to ship. Say in mt-ship that `partial (environment only)` is acceptable in auto mode when the PR lists the gaps.
