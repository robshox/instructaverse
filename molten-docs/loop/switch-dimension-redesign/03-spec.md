---
feature: Switch Dimension redesign
slug: switch-dimension-redesign
created: 2026-11-22
status: approved
approved_by: auto
discovery: molten-docs/loop/switch-dimension-redesign/01-discovery.md
prototype: null
design: Doop canvas 5scx7SJUTV, page "Redesign — Switch Dimension style"; guideline doc redesign-instructaverse-app
molten_next_skill: mt-plan
---

# Spec — Switch Dimension redesign

## Summary
Restyle every screen of the app to the approved Switch Dimension design: dark console look, Inter Tight and IBM Plex Mono, one orange accent, pill buttons, a branded member nav and an admin sidebar shell. Build the frames' small improvements from data the app already has: a home dashboard, a lesson outline, board list counts, drag reorder, Add to calendar, a Markdown preview and a plan list toggle. Existing behaviour, gates and tests are unchanged.

## Goals
- G1. Every existing screen matches its approved Doop frame in style and layout.
- G2. The frames' improvements work with real data, not placeholder content.
- G3. Nothing that works today stops working.
- G4. Branding is configurable, so other installs aren't Switch Dimension-branded.

## Non-goals
- New product features beyond those listed in FR-4 to FR-10.
- Phase 5–7 work (migration, API, members and settings pages, README).
- Light mode.
- Streaks, video time left, lesson durations, course type labels, a house rules card, "join link opens 15 min before", masked buyer emails.
- Changing any server action's rules, validation, auth or access gates.

## Assumptions (auto mode, from discovery A1–A6; see auto.md)
- Inter Tight and IBM Plex Mono are loaded with `next/font/google`, replacing Geist and the Arial override.
- Brand comes from env (`BRAND_NAME`, `BRAND_LOGO_URL`, `BRAND_TAGLINE`), defaulting to Switch Dimension values. The values are optional, not required at startup.
- Dark theme only.
- Icons are inline SVG (Lucide paths); there are no runtime requests to icon CDNs.
- "Next incomplete lesson" means the first lesson, in outline order, that the member hasn't completed in the course they most recently completed a lesson in. With no completions anywhere, it's the first lesson of their first course.

## User stories
- US-1. As a member, I land on a home page that shows where to continue, my progress, the next event and recent board activity.
- US-2. As a member, while watching a lesson I can see the whole course outline and go straight to the next lesson.
- US-3. As a member, I can add an event to my calendar.
- US-4. As an admin, I can reorder lessons, modules and boards by dragging, or with the keyboard.
- US-5. As an admin, I can preview lesson Markdown before saving, and list or unlist a plan in one click.
- US-6. As anyone, the app looks and reads like Switch Dimension (or the brand configured for the install).

## Functional requirements

### FR-1 Design system
- FR-1.1 Global tokens in `globals.css` as Tailwind theme values: bg `#0b0b0b`, surfaces `#121212` / `#181818`, lines `#242424` / `#333`, text `#fff`, muted `#9b9b9b`, dim `#5f5f5f`, accent `#f50` (text on accent `#0b0b0b`), green `#22e584`, red `#ff2d55`, yellow `#ffd60a`.
- FR-1.2 Fonts: Inter Tight (sans) and IBM Plex Mono (mono) via `next/font/google`. No Arial override.
- FR-1.3 Shared UI primitives used across pages: pill buttons (primary, secondary, danger), inputs and labels (mono uppercase labels), cards, tags and chips, progress bar, eyebrow labels, and an icon component.
- FR-1.4 Rendered Markdown (`.prose-content`) restyled: `>` bullets in accent, accent-underlined links, mono inline code on a surface, accent-ruled blockquotes.

### FR-2 Brand
- FR-2.1 A brand module provides the community name, logo URL and tagline from env, with Switch Dimension defaults.
- FR-2.2 Page titles use "<page> · <brand name>"; the root default title is the brand name. No "Create Next App" anywhere.

### FR-3 Layouts and navigation
- FR-3.1 Member nav: logo, then mono uppercase links (Courses, Board, Events), and Account as an outline pill. The active section is white with an accent underline.
- FR-3.2 `/account` uses the member nav (it moves into the member layout, or renders the same nav).
- FR-3.3 Member content uses a fixed max width (1120px), with no shrink-to-content.
- FR-3.4 Admin layout: a 240px left sidebar (logo, "Admin" label, icon links for Courses, Boards, Events, Plans and Groups, and View site at the bottom), with the active item highlighted. Content sits to the right. The admin gate is unchanged.
- FR-3.5 Public pages (pricing, login, reset, setup, after checkout) get a slim header: the logo plus one contextual link ("Member login" on pricing, "Join" on login).

### FR-4 Member home (`/courses`)
- FR-4.1 A greeting with the member's first name.
- FR-4.2 A totals card: lessons completed out of total lessons, across the member's accessible courses.
- FR-4.3 A "Continue" card for the next incomplete lesson (per the Assumptions rule), with its course, module number, lesson position, the course's progress bar and a Resume button. Hidden when every accessible lesson is complete or the member has no courses.
- FR-4.4 Course cards: number, title, description, module and lesson counts, and a progress bar with %.
- FR-4.5 Sidebar: the next upcoming event the member can see (date block, title, time in their zone, View events), and the latest post on a board they can see (excerpt, author, reply and like counts). Each panel is hidden when empty.

### FR-5 Course outline and lesson
- FR-5.1 Course page: header (title, description, module and lesson counts) and a progress card (completed / total, next up, Resume).
- FR-5.2 Module cards show "n / m complete" and lesson rows with a state: done (green check), up next (accent, "UP NEXT"), or not started.
- FR-5.3 Lesson page: the video area (player when ready, "Video processing" while preparing, nothing without a video), module and lesson position, title, Mark complete, a Next lesson button (hidden on the last lesson), Markdown notes, and the transcript. A WebVTT transcript shows timestamped cues; plain text shows as text.
- FR-5.4 Lesson sidebar: the course outline with each lesson's state and the current lesson highlighted, plus the course progress bar.

### FR-6 Board
- FR-6.1 Composer and post cards restyled. Posts show author initials, name, mono timestamp, "edited", a HOST tag for admins, a PINNED tag, images, like and reply counts, and comments.
- FR-6.2 Sidebar: the boards the member can see, each with its post count, current board highlighted.

### FR-7 Events
- FR-7.1 Event cards with a mono date block (month, day, weekday), times in the viewer's zone, a "in N days" badge for upcoming events, duration, the groups label, description, and Join on Zoom.
- FR-7.2 Add to calendar downloads an `.ics` file for an event the viewer can see (title, start/end in UTC, description, Zoom URL). Events they can't see return 404.

### FR-8 Account, pricing, sign-in and access pages
- FR-8.1 Account: avatar initials, name, email, "member since"; a membership card per purchase (plan, status tag, price, renews/ends or access-until, groups) and Manage billing; the password card. Existing behaviour unchanged.
- FR-8.2 Pricing: brand eyebrow, H1 and tagline from brand; plan cards with path letter, name, description first line, Stripe price, bullets from any further description lines, and Join (primary for the first plan, secondary for the rest).
- FR-8.3 Login, reset and setup restyled, with the email field in the pill style and a `>` prompt.
- FR-8.4 After checkout: the existing polling shown as terminal-style steps (payment received, granting access, sign-in link), the sign-in link button enabled when ready. No email address shown.
- FR-8.5 No-access panel: lock icon, title, explanation, the plans that grant access with their prices, See all plans, and Back to your courses.

### FR-9 Admin screens
- FR-9.1 Courses: a table (course, module count, who can see it as tags or "Admins only", lesson count, video status summary, Edit) with a quick-create form.
- FR-9.2 Course editor: a details card; modules and lessons with drag handles, a video status per lesson (ready, processing, error, no video), add lesson, add module, rename; a sidebar with visibility chips, a summary (counts) and a Danger zone delete with confirmation.
- FR-9.3 Drag reorder: dragging a lesson within its module, a module within its course, or a board in the board list saves the new order. Keyboard users can still move items up and down with buttons.
- FR-9.4 Lesson editor: title; Markdown editor with Write and Preview tabs; transcript with a "WebVTT · used as captions" tag when it starts with WEBVTT; video panel with a drag-and-drop upload area (same direct-to-Mux upload), status, and attach existing asset.
- FR-9.5 Plans: cards (billing type, name, Stripe price, price IDs, granted groups, buyers count, listed toggle, Edit) and a new-plan card. The listed toggle saves immediately. Editing and deleting keep today's forms and rules (can't delete with purchases).
- FR-9.6 Groups: a table (group, members, used by: counts of courses/boards/events, granted by: plans, rename, delete with inline confirm).
- FR-9.7 Boards: rows (drag handle, name, visibility tags, post count, Edit) and a new-board form with group chips.
- FR-9.8 Events: an upcoming/past list with date blocks, a time in the organiser's zone, groups tags and Edit, beside the create form (title, description, start, end, time zone, Zoom link, group chips).

## Acceptance criteria (Given / When / Then)

### Design system and brand
- **AC-1** Given any page, then body text renders in Inter Tight and mono labels in IBM Plex Mono; no element computes `font-family` to Arial.
- **AC-2** Given any page, then the page background is `#0b0b0b`, and the primary button is the accent `#f50` with dark text.
- **AC-3** Given no BRAND_* env vars, then the nav shows the Switch Dimension logo and titles end "· Switch Dimension Accelerator"; given `BRAND_NAME=Acme Academy` and `BRAND_LOGO_URL=…`, then those are used instead. No page title is "Create Next App".
- **AC-4** Given body and muted text on their backgrounds, then contrast is at least WCAG AA (4.5:1 for normal text).

### Layout and navigation
- **AC-5** Given any member page (courses, course, lesson, board, events, account), then the member nav shows, with the current section marked active; /account shows it too.
- **AC-6** Given member pages with little content (e.g. an empty board), then the content column is still the full fixed width (1120px max), not shrunk to its content.
- **AC-7** Given any admin page, then the sidebar shows with the current section active, and members still get the not-found page (gate unchanged).

### Member home
- **AC-8** Given a member with completions, then home shows "Welcome back, <first name>" and totals "<completed> of <total> lessons complete" matching their accessible courses.
- **AC-9** Given completions in course C, then the Continue card points to C's first incomplete lesson in outline order; Resume links to it.
- **AC-10** Given a member with no completions, then Continue points to the first lesson of their first course; given every accessible lesson complete, then no Continue card shows.
- **AC-11** Given course cards, then each shows module and lesson counts and a progress % equal to completed / total for that member.
- **AC-12** Given an upcoming event the member can see, then the sidebar shows the soonest one; given none, then the panel is hidden. The same applies to the latest post (only from boards they can see).

### Course and lesson
- **AC-13** Given a course page, then each module shows "n / m complete", lesson rows show done, up next or not started correctly, and the progress card's "Next up" matches AC-9's rule for that course.
- **AC-14** Given a lesson that isn't last, then Next lesson links to the following lesson in outline order (crossing into the next module); given the last lesson, then no Next lesson button shows.
- **AC-15** Given a lesson page, then the sidebar lists the course's lessons by module with states, and the current lesson is highlighted.
- **AC-16** Given a WebVTT transcript, then the transcript panel shows each cue's start time (mm:ss) next to its text; given plain text, then it shows the text.
- **AC-17** Given the existing lesson behaviours (signed playback, captions, Mark complete, no-access, not-found), then they still work as before.

### Board
- **AC-18** Given a board, then the sidebar lists boards the member can see with correct post counts, current board highlighted; boards they can't see aren't listed.
- **AC-19** Given a post by an admin, then it shows a HOST tag; pinned posts show PINNED; edited posts show "edited"; existing post, comment, like, edit, delete and pin behaviours still work.

### Events
- **AC-20** Given an upcoming event, then its card shows month, day and weekday, the time in the viewer's zone, and "IN N DAYS" (or "TODAY"); past events show no Join button.
- **AC-21** Given a member who can see event E, when they request its calendar file, then they get `text/calendar` with E's title, UTC start and end (start + 2h if no end), description and Zoom URL; given a member who can't see E, then 404.

### Account, pricing, sign-in, access
- **AC-22** Given a member with a purchase, then the account page shows a membership card with plan name, status tag, price (when Stripe returns one) and dates; given none, then "No membership yet" with a link to plans. Manage billing and the password form still work.
- **AC-23** Given listed plans, then pricing shows them in order with path letters, Stripe price when available, bullets for extra description lines, and Join posting to checkout as before.
- **AC-24** Given the login, reset and setup pages, then they're restyled and every existing flow (magic link, password, throttle message, reset, setup) still works.
- **AC-25** Given the after-checkout page, then steps show "payment received" and progress while polling, the sign-in link button is enabled once ready, and no email address appears in the page.
- **AC-26** Given a member without access to a course, then the no-access panel lists only the listed plans that grant it, with prices when available.

### Admin
- **AC-27** Given the admin courses table, then each row shows module count, visibility tags (or "Admins only"), lesson count and a correct video status summary (ready, processing, error, none counts).
- **AC-28** Given an admin dragging a lesson to a new position in its module, then after reload the order is saved; likewise for modules in a course and boards in the list. Moving items with the keyboard buttons still works.
- **AC-29** Given a reorder request from a non-admin, or with IDs from another module, course or board set, then it's refused and the order is unchanged.
- **AC-30** Given the lesson editor, when the admin switches to Preview, then the current Markdown renders with the same component members see, without saving.
- **AC-31** Given a plan card, when the admin flips the listed toggle, then the plan's listed state is saved and /pricing reflects it; non-admins are refused.
- **AC-32** Given the groups table, then "used by" counts match the courses, boards and events that use each group, and "granted by" lists the plans that grant it.
- **AC-33** Given every admin screen, then every existing create, edit, delete and confirm action still works (regression via existing tests plus browser checks).

### Regression
- **AC-34** Given the full test suite, then all existing tests pass, typecheck, lint and build are clean, and new logic has tests.

## Data model & API shape
No schema changes. New server-side functions (names are mt-plan's call):
- next incomplete lesson for a member (overall and per course)
- module completion counts per course for a member
- boards with post counts for a viewer
- latest visible post for a viewer
- reorder (lessons in a module, modules in a course, boards), taking an ordered ID list and validating that it's exactly the current set
- set plan listed
- group usage counts and granting plans
- video status summary per course
- `.ics` builder

New route: `GET /events/[id]/calendar.ics` (or similar), with the event access check.

## UX notes
- **Source of truth:** the 17 frames on Doop page "Redesign — Switch Dimension style" and the guideline doc `redesign-instructaverse-app`. Where the frames show invented content (streaks, durations, house rules, Switch Dimension-specific copy), the cuts and data rules above win.
- Empty states keep today's messages, restyled (no courses, no posts, no events, no plans).
- Member pages work down to tablet width; admin pages target desktop.

## Edge cases & error states
- A member with no courses: home shows the greeting and an empty state linking to /pricing; no Continue card or totals.
- A course with no lessons: shows "No lessons yet", no Resume, and progress shows 0 / 0 without dividing by zero.
- A lesson with no video, or one still processing or errored: the video area follows FR-5.3, and the editor shows the right status tag.
- An event with no end: .ics and duration use start + 2h.
- A plan with no Stripe price: no price shown (as today).
- Drag reorder with a stale page (items changed meanwhile): refused if the IDs don't match the current set; the page reloads to the current order.
- Missing logo URL or one that won't load: the brand name shows as text.

## Non-functional requirements
- **Accessibility:** AA contrast; visible focus rings (accent); every icon-only button has an accessible label; drag reorder has keyboard alternatives.
- **Performance:** no new client bundles beyond the drag, toggle and preview components; fonts self-hosted.
- **Privacy:** no third-party requests from members' browsers except the configured logo URL and Mux playback.
- **Security:** every new action and route uses the existing guards (`requireAdmin`, viewer access checks).

## Testing approach
- **Unit and integration (Vitest):** next-incomplete-lesson rules (AC-9, AC-10, AC-13), module counts, totals (AC-8, AC-11), latest visible post and next visible event (AC-12), board post counts and visibility (AC-18), reorder validation and persistence (AC-28, AC-29), plan listed toggle with guard (AC-31), group usage (AC-32), video status summary (AC-27), .ics content and access (AC-21), VTT cue parsing with timestamps (AC-16), brand defaults and env override (AC-3).
- **Browser (standalone build, demo data):** visual match against each frame, fonts and colours (AC-1, AC-2, AC-4), nav and layout (AC-5 to AC-7), every regression flow (AC-17, AC-19, AC-22 to AC-26, AC-33), drag reorder (AC-28).
- **Regression:** the existing 152 tests stay green (AC-34).

## Boundaries
- **Always:** keep every existing server action, gate and validation; test new logic; browser-check each area; use the brand module, never hard-coded Switch Dimension strings in components.
- **Ask first:** new runtime dependencies (allowed in auto mode only if reversible on the branch and logged); schema changes (none planned).
- **Never:** change auth, access or billing rules; remove a working control; commit secrets; load icons or fonts from third-party CDNs at runtime.

## Open questions
None blocking. Rob reviews the auto decisions in `auto.md` in the PR.
