---
feature: Switch Dimension redesign
slug: switch-dimension-redesign
created: 2026-11-22
spec: molten-docs/loop/switch-dimension-redesign/03-spec.md
reviewed_commit: 690aaf1
reviewers: single-context (spec and quality briefs run in turn in the building session; the host spawns subagents only when the user asks, see auto.md decision 3); second opinion skipped
recommendation: request-changes
molten_next_skill: mt-build
---

# Review — Switch Dimension redesign

## Intent
Restyle every screen of the app to the approved Switch Dimension design (dark console look, Inter Tight and IBM Plex Mono, one orange accent, pill buttons, branded member nav, admin sidebar shell). Also build the frames' improvements from data the app already has: a home dashboard, lesson outline sidebar and timestamped transcript, board counts, drag reorder, Add to calendar, a Markdown preview and a plan listed toggle. Existing behaviour, gates and tests stay unchanged, and there are no schema changes.

Scope: `git diff feat/SWI-198-community-platform-v1...HEAD`, 92 files, +4631 / −953, 33 commits. The diff is far over the ~300-line guide, but it is the planned restyle of every screen, landed as 19 reviewable task commits, so it is reviewed per task rather than split.

## Summary
Spec: pass. None of the 34 ACs is missing; the gaps verify recorded are environment-only.
Quality: fail. The course editor's module and lesson menus are clipped by their card; the account page can show a price the member doesn't pay.
A careful, well-tested restyle. Two real defects need a short loop-back before shipping.

## Spec findings
### Suggestions
- `src/app/admin/courses/[courseId]/lessons/[lessonId]/fields.tsx:11` — AC-30 (Preview renders without saving) has browser evidence only; there's no automated test, because the repo has no DOM test environment. Acceptable under the spec's testing plan ("Browser … AC-28"), but worth a component-test setup later.
### Questions
- None. The deviations from the frames (route path, chip placement, cut extras) are recorded as decisions 9, 10, 19 and 20.

## Quality findings
### Blockers
- `src/app/admin/courses/[courseId]/page.tsx:72` — The "Modules & lessons" `Card` has `overflow-hidden`, but each module's ⋯ menu (rename and delete) and each lesson's delete popover are `absolute` children inside it. **Evidence:** with the last module's menu open, the popover bottom is 1028 px against the card bottom of 1020 px; the bottom edge is cut off and any validation message pushes Delete module out of view. Scrolling the menu into view also scrolled the card's own content, hiding the card header (screenshot taken in review). This breaks AC-33 ("every existing … edit, delete and confirm action still works") for the last module. **Fix:** drop `overflow-hidden` from that card (round the inner rows instead), or render the menus in flow rather than absolute. (raised by: quality)
- `src/app/(member)/account/page.tsx:89` — The membership card's price is `getPriceLabel(plan.checkoutPriceId)`, the plan's *current* sign-up price. Plans deliberately keep older Stripe price IDs so existing subscribers map to them (plan form help text: "add older prices so existing subscribers map to this plan"). **Evidence:** a legacy subscriber on an older price would see the new price as theirs, which is misleading billing information. AC-22 asks for "price (when Stripe returns one)", meaning their price. The purchase row doesn't store a price ID, so the app can't know which one they pay. **Fix:** show the price only when the plan has exactly one Stripe price, so it's unambiguous; otherwise omit it. (raised by: quality)
### Suggestions
- `src/components/sortable-list.tsx:66` — The whole `<li>` is `draggable`, and the rows contain form inputs: the add-lesson field, the rename form, and BoardForm inside admin board rows. Some browsers (notably Firefox) don't let you select text in an input inside a draggable element, and a text-select gesture can start a row drag. **Fix:** make the row draggable only while its grip handle is pressed.
- `src/app/admin/courses/actions.ts:82` and `src/lib/courses/admin.ts:41,75` — The `module:up/down` and `lesson:up/down` branches and `moveModule` / `moveLesson` have no UI callers left; the ↑/↓ buttons now use the reorder actions (decision 20). This is an old path kept alive next to its replacement. Remove them with their tests in a follow-up.
### Nits
- Nit: the admin course editor and lesson editor pages have no `metadata` title, so the tab shows just the brand name. This is pre-existing (they had none before) and doesn't block.

## Praise
- Exact-set validation inside a single transaction for every reorder, plus tests for cross-scope, partial, duplicate and unknown IDs, and new tests proving non-admins are refused.
- The `.ics` builder follows RFC 5545 escaping and octet-safe folding, and its access check reuses `canAccess`.
- Every new route and action reuses the existing guards (`requireAdmin`, `canAccess`, `listBoardsFor`). No new dependencies, and no schema changes.
- Hydration-safe viewer-zone formatting via `useSyncExternalStore`, and reconciling SortableList's local order without `setState` in an effect.

## Dismissed
- "`Icon` uses `dangerouslySetInnerHTML`" — raised by quality — the markup comes from a static, build-time map of Lucide paths; no user input reaches it.
- "Zoom URL written unescaped into the `.ics` `URL:` line could inject lines" — raised by quality — event input parses it with `new URL()` and stores `url.toString()`, which can't contain raw CR or LF (`src/lib/events/index.ts`).
- "Bound `moduleId` / `courseId` in the reorder actions can be tampered with from the client" — raised by quality — the actions require admin, and the IDs must exactly match that module's or course's current set; a tampered scope can only reorder another scope's items using that scope's own IDs, which an admin may do anyway.
- "Account page calls `getPlan` once per purchased plan (N+1)" — raised by quality — a member has one or two purchases; the cost is negligible.
- "PostCard timestamps format in the browser's locale and may mismatch on hydration" — raised by quality — pre-existing, and the redesign adds `suppressHydrationWarning` to those nodes.

## Second opinion
Skipped. The change doesn't touch auth, payment or migration logic (only the UI on those pages), so it isn't "risky" under the skill's definition. Sending the code to another provider's CLI (Codex) also isn't covered by the brief from Rob.

## Recommendation
**Request changes.** Fix the two blockers (editor menus clipped; account price shown when it may not be the member's price) and, since it's cheap and in the same area, the draggable-row suggestion. Then re-run verify on the affected screens and review again.
