---
feature: Course & community platform v1 (Circle replacement)
slug: community-platform-v1
created: 2026-11-22
spec: molten-docs/loop/community-platform-v1/03-spec.md
status: in-progress
issue_tracker: linear
tracker_parent: https://linear.app/switch-dimension/issue/SWI-198
molten_next_skill: mt-build
---

# Plan — Course & community platform v1 (Circle replacement)

## Approach
Greenfield: the repo has no application code yet. Build foundations first (app shell, database, auth, Docker). Then build groups, access and Stripe payments early, proven in Stripe test mode. After that come the member-facing features (courses → board → events), then the Circle/Stripe migration with a test-mode cutover rehearsal, then the API and the remaining admin, then release hardening.

Every domain gets a small service module (`src/lib/<domain>/`). Admin pages (server actions) and the REST API (Phase 6) both call these modules, so the logic is never duplicated, and "everything the admin can do is in the API" (AC-32) is cheap to prove.

## Architecture decisions
- **AD-1 Framework:** Next.js (App Router, TypeScript, `output: "standalone"`) on Node 24. One process serves the member UI, the admin UI, the webhooks and `/api/v1`.
- **AD-2 Database:** SQLite (better-sqlite3, WAL mode) through Drizzle ORM. Schema lives per domain in `src/db/schema/*.ts`. Migrations are generated into `drizzle/` and run automatically on start. The data volume is mounted at `/data` (`/data/app.db`, `/data/uploads/`).
- **AD-3 Auth:** Better Auth with the Drizzle adapter, email and password, the magic-link plugin, and a custom `role` field on users. Auth emails are sent with Nodemailer (SMTP).
- **AD-4 Payments:** the official `stripe` SDK. Checkout Sessions for both one-off and recurring plans, plus the Customer Portal. Webhooks arrive at `/api/webhooks/stripe` with signature verification, and a `webhook_events` table makes processing idempotent. Migration uses a **read-only Stripe wrapper** that exposes only list and retrieve calls (AC-38).
- **AD-5 Video:** `@mux/mux-node` handles direct uploads, asset webhooks and signed playback tokens. `@mux/mux-player-react` plays video, using WebVTT as a captions track.
- **AD-6 API:** route handlers under `src/app/api/v1/**`. Zod schemas are the single source for validation **and** OpenAPI (`@asteasolutions/zod-to-openapi`). The OpenAPI registry index (`src/lib/api/openapi/index.ts`) imports one module per domain, so tasks working in parallel never edit the same file.
- **AD-7 UI:** Tailwind CSS with shadcn/ui components, and a neutral theme (no `design.md` yet).
- **AD-8 Uploads:** images are stored under `/data/uploads/` and served by an authorised route (`/media/[...path]`), never as static files. Image content is checked with `file-type`.
- **AD-9 Tests:** Vitest for unit and integration tests (against a temporary SQLite file), Playwright for end-to-end tests, and the Stripe CLI plus test mode with fixture events for webhooks.
- **AD-10 Docker:** a multi-stage `Dockerfile` (node:24-slim) whose entrypoint validates the environment, runs migrations, then starts the server.

## Dependencies & setup (packages, migrations, env vars)
- **Packages:** next, react, typescript, drizzle-orm, drizzle-kit, better-sqlite3, better-auth, nodemailer, stripe, @mux/mux-node, @mux/mux-player-react, zod, @asteasolutions/zod-to-openapi, file-type, tailwindcss, shadcn/ui (copied components), vitest, @playwright/test.
- **Environment variables:** `BASE_URL`, `AUTH_SECRET`, `DATA_DIR` (default `/data`), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_PRIVATE_KEY`, `MUX_WEBHOOK_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- **Migrations:** Drizzle, one migration per schema-changing task. Tasks that change the schema never share a wave, because the `drizzle/` journal would conflict.
- **External setup:** a Stripe test-mode account with the Stripe CLI, and a Mux account with a signing key.
- **Database branch: no.** SQLite is a local file. mt-build isolates it per worktree, so no hosted branchable database is involved.

> Tasks live in Linear under [SWI-198](https://linear.app/switch-dimension/issue/SWI-198) (project [Instructaverse](https://linear.app/switch-dimension/project/instructaverse-42287ec20527)). This plan links to them and never tracks their status.

## Phase 1 — Foundations
- [SWI-199](https://linear.app/switch-dimension/issue/SWI-199) 1.1 Scaffold the app with env validation and health check · wave 1
- [SWI-200](https://linear.app/switch-dimension/issue/SWI-200) 1.2 Database, auth schema and first-admin setup flow · wave 2
- [SWI-201](https://linear.app/switch-dimension/issue/SWI-201) 1.3 Magic-link and password login with rate limiting · wave 3
- [SWI-202](https://linear.app/switch-dimension/issue/SWI-202) 1.4 Docker image with migrate-on-start and persistent volume · wave 3
- **Checkpoint 1:** tests green. The container runs locally, the setup flow creates an admin, and magic-link login works through a local SMTP catcher (e.g. Mailpit).

## Phase 2 — Access & payments
- [SWI-203](https://linear.app/switch-dimension/issue/SWI-203) 2.1 Groups, memberships with sources, and the access engine · wave 4
- [SWI-204](https://linear.app/switch-dimension/issue/SWI-204) 2.2 Plans admin and public pricing page · wave 5
- [SWI-205](https://linear.app/switch-dimension/issue/SWI-205) 2.3 Stripe Checkout and verified, idempotent webhook granting access · wave 6
- [SWI-206](https://linear.app/switch-dimension/issue/SWI-206) 2.4 Subscription lifecycle and refund handling · wave 7
- [SWI-207](https://linear.app/switch-dimension/issue/SWI-207) 2.5 Account page, Customer Portal and post-checkout "finishing setup" · wave 7
- **Checkpoint 2:** a full test-mode run with the Stripe CLI: buy → access → cancel → revoke. You review the access rules.
  - **Deferred (2026-11-22, user request):** the Stripe test-mode run and access-rules review move to the end, tracked in [SWI-230](https://linear.app/switch-dimension/issue/SWI-230), which blocks 7.2. Everything else in Checkpoint 2 passed (fixture-event tests and browser checks).

## Phase 3 — Courses
- [SWI-208](https://linear.app/switch-dimension/issue/SWI-208) 3.1 Course, module and lesson schema with gated member pages · wave 8
- [SWI-209](https://linear.app/switch-dimension/issue/SWI-209) 3.2 Signed Mux playback with captions · wave 9
- [SWI-210](https://linear.app/switch-dimension/issue/SWI-210) 3.3 Lesson completion and course progress · wave 10
- [SWI-211](https://linear.app/switch-dimension/issue/SWI-211) 3.4 Admin course editor with Mux direct upload · wave 10
- **Checkpoint 3:** a member buys a plan and watches a gated lesson with captions and progress. You do a UX pass.

## Phase 4 — Community
- [SWI-212](https://linear.app/switch-dimension/issue/SWI-212) 4.1 Boards, image posts and protected media · wave 11
- [SWI-213](https://linear.app/switch-dimension/issue/SWI-213) 4.2 Comments, author edit/delete and admin pin/delete · wave 12
- [SWI-214](https://linear.app/switch-dimension/issue/SWI-214) 4.3 Likes on posts and comments · wave 13
- [SWI-215](https://linear.app/switch-dimension/issue/SWI-215) 4.4 Events with time zones and gated Zoom links · wave 14
- **Checkpoint 4:** the community end to end: post, comment, like, pin, and join an event link. You review the board UX.

## Phase 5 — Circle/Stripe migration (riskiest unknown)
- [SWI-216](https://linear.app/switch-dimension/issue/SWI-216) 5.1 Read-only Stripe wrapper and migration dry run with price mapping · wave 15
- [SWI-217](https://linear.app/switch-dimension/issue/SWI-217) 5.2 Idempotent migration commit and account claim · wave 16
- [SWI-218](https://linear.app/switch-dimension/issue/SWI-218) 5.3 Circle CSV import for non-Stripe members · wave 16
- **Checkpoint 5:** a **cutover rehearsal in Stripe test mode** that mirrors the live price structure (OQ-4), run as dry run then commit then claim. You decide whether to investigate OQ-2 (Circle's Stripe link) before going further.

## Phase 6 — API & admin completion
- [SWI-219](https://linear.app/switch-dimension/issue/SWI-219) 6.1 API keys, bearer auth, error format and OpenAPI skeleton · wave 17
- [SWI-220](https://linear.app/switch-dimension/issue/SWI-220) 6.3 API: courses, modules, lessons, Mux upload URLs and bulk import · wave 18
- [SWI-221](https://linear.app/switch-dimension/issue/SWI-221) 6.4 API: boards, posts, comments, likes and events · wave 18
- [SWI-222](https://linear.app/switch-dimension/issue/SWI-222) 6.5 API: migration runs and admin migration report · wave 18
- [SWI-223](https://linear.app/switch-dimension/issue/SWI-223) 6.6 Admin members page: search, groups with sources, deactivate · wave 18
- [SWI-224](https://linear.app/switch-dimension/issue/SWI-224) 6.7 Settings page: community name, logo and config status · wave 18
- [SWI-225](https://linear.app/switch-dimension/issue/SWI-225) 6.2 API: plans, groups, members and memberships · wave 19
- **Checkpoint 6:** Claude Code (or curl) creates a course through the API using the OpenAPI document; the coverage test is green.

## Phase 7 — Release readiness
- [SWI-226](https://linear.app/switch-dimension/issue/SWI-226) 7.1 README, MIT licence and env example · wave 20
- [SWI-227](https://linear.app/switch-dimension/issue/SWI-227) 7.2 End-to-end suite for the core journeys · wave 20
- **Checkpoint 7:** all tests green on the Docker image; ready for **mt-verify**.

## Parallel waves
| Wave | Tasks | Can start when |
| --- | --- | --- |
| 1 | 1.1 (SWI-199) | Plan approved |
| 2 | 1.2 (SWI-200) | 1.1 done |
| 3 | 1.3 (SWI-201), 1.4 (SWI-202) | 1.2 done |
| 4 | 2.1 (SWI-203) | Checkpoint 1 passed |
| 5 | 2.2 (SWI-204) | 2.1 done |
| 6 | 2.3 (SWI-205) | 2.2 done |
| 7 | 2.4 (SWI-206), 2.5 (SWI-207) | 2.3 done |
| 8 | 3.1 (SWI-208) | Checkpoint 2 passed |
| 9 | 3.2 (SWI-209) | 3.1 done |
| 10 | 3.3 (SWI-210), 3.4 (SWI-211) | 3.2 done |
| 11 | 4.1 (SWI-212) | Checkpoint 3 passed |
| 12 | 4.2 (SWI-213) | 4.1 done |
| 13 | 4.3 (SWI-214) | 4.2 done |
| 14 | 4.4 (SWI-215) | 4.3 done (serialised because both change the schema) |
| 15 | 5.1 (SWI-216) | Checkpoint 4 passed |
| 16 | 5.2 (SWI-217), 5.3 (SWI-218) | 5.1 done |
| 17 | 6.1 (SWI-219) | Checkpoint 5 passed |
| 18 | 6.3 (SWI-220), 6.4 (SWI-221), 6.5 (SWI-222), 6.6 (SWI-223), 6.7 (SWI-224) | 6.1 done |
| 19 | 6.2 (SWI-225) | 6.6 done |
| 20 | 7.1 (SWI-226), 7.2 (SWI-227) | Checkpoint 6 passed |

Most of the build is serial. That's deliberate: almost every early slice adds schema, and the `drizzle/` journal can't take parallel migrations. Wave 18 is where parallel agents pay off.

**Order change (approved 2026-11-22):** migration moved from Phase 3 to Phase 5, after courses and community, at the user's request. Payments (Phase 2) are still proven early in Stripe test mode. The migration's riskiest unknowns (OQ-1 Circle export, OQ-2 Circle's Stripe link) should still be investigated outside the build, early.

## Risks & mitigations
- **Stripe cutover goes wrong (live money and access).** Mitigations: the read-only Stripe wrapper with a guard test, a mandatory dry run, idempotent commit, a test-mode rehearsal at Checkpoint 5, and no action on live Stripe without your go-ahead (spec Boundaries).
- **Disconnecting Circle cancels subscriptions (OQ-2).** Mitigation: answer it before the live cutover (Circle support, or check whether the subscriptions sit directly in your Stripe account). The order of steps is: platform live → members claim → disconnect Circle.
- **Circle export is incomplete or awkward (OQ-1), especially videos.** Mitigation: the bulk import API accepts Mux source URLs or existing assets. Do a real export early, in parallel with Phase 1–2.
- **Better Auth magic-link or role customisation fights the spec.** Mitigation: tasks 1.2 and 1.3 are small, and switching to hand-rolled sessions stays an option before Phase 2.
- **SQLite write contention.** Low risk at this scale. WAL mode, one process.
- **Mux signed playback setup complexity.** Isolated in 4.2, with a manual check.

## Noticed during build
File findings as issues under the parent, [SWI-198](https://linear.app/switch-dimension/issue/SWI-198).

## Definition of done (all acceptance criteria verified, with AC → task coverage)
| AC | Task(s) | AC | Task(s) |
| --- | --- | --- | --- |
| AC-1 | 1.2 | AC-24 | 4.2 |
| AC-2 | 1.3 | AC-25 | 4.2 |
| AC-3 | 1.3 | AC-26 | 4.1 |
| AC-4 | 1.3 | AC-27 | 4.4 |
| AC-5 | 6.6 | AC-28 | 4.4 |
| AC-6 | 2.3, 7.2 | AC-29 | 2.2, 3.4, 4.4 (+ 2.1 groups, 4.1 boards) |
| AC-7 | 2.3 | AC-30 | 6.6 |
| AC-8 | 2.4 | AC-31 | 6.1 |
| AC-9 | 2.4 | AC-32 | 6.2, 6.3, 6.4 |
| AC-10 | 2.4 | AC-33 | 6.1 |
| AC-11 | 2.1, 2.4 | AC-34 | 6.3 |
| AC-12 | 2.3 | AC-35 | 5.1, 6.5 |
| AC-13 | 2.3 | AC-36 | 5.1, 6.5 |
| AC-14 | 2.5 | AC-37 | 5.2 |
| AC-15 | 2.4 | AC-38 | 5.1 |
| AC-16 | 3.1, 7.2 | AC-39 | 5.2, 7.2 |
| AC-17 | 2.1, 3.1 | AC-40 | 5.2 |
| AC-18 | 3.2 | AC-41 | 5.3 |
| AC-19 | 3.2 | AC-42 | 5.1 |
| AC-20 | 3.3 | AC-43 | 1.4 |
| AC-21 | 3.4 | AC-44 | 1.1, 1.4 |
| AC-22 | 4.1, 7.2 | AC-45 | 1.4 |
| AC-23 | 4.1 | AC-46 | 4.3, 6.4 |

Done means every AC above is verified with evidence by **mt-verify**, all checkpoints are passed, and the Docker image passes the end-to-end suite.
