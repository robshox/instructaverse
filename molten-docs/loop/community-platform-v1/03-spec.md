---
feature: Course & community platform v1 (Circle replacement)
slug: community-platform-v1
created: 2026-11-22
status: approved
discovery: molten-docs/loop/community-platform-v1/01-discovery.md
prototype: null
molten_next_skill: mt-plan
---

# Spec — Course & community platform v1 (Circle replacement)

## Summary
An open-source (MIT), self-hostable course-and-community platform shipped as a single Docker image. Members sign up, pay through Stripe (one-off or recurring plans), and get access to areas (courses, notice boards, events) based on the member groups their plan grants. Courses are Mux video lessons with text and transcripts. The notice board supports image and text posts with comments. Events are Zoom links. Admins work through a minimal admin area and a full REST API. Launch includes migrating Switch Dimension's roughly 100 paying members (with their existing Stripe subscriptions) and course content off Circle.

## Goals
- G1. Switch Dimension can move all members and course content off Circle and cancel it.
- G2. Existing paying members keep access and billing through the move: no re-payment, no double charge, no lapse.
- G3. New members can sign up, pay and get access with no admin involvement.
- G4. Everything an admin can do is also possible through the API, so Claude Code and scripts can manage the platform.
- G5. A third party can deploy it from one Docker image plus environment variables.

## Non-goals (launch)
- AI course tutor/agent
- Quizzes and certificates
- MCP server (a later release, built on the API)
- Full-featured admin UI (admin is minimal; the API covers the rest)
- Zoom integration (events are links only)
- Transcript generation (transcripts are imported)
- Migrating Circle notice-board posts and comments (the board starts fresh)
- Multiple communities per install (multi-tenancy)
- Direct messages, member directory, search, email or push notifications for activity
- Coupons, trials, taxes beyond what Stripe Checkout handles natively
- Horizontal scaling (one container, one volume)

## Assumptions (confirmed with user 2026-11-22; spec approved 2026-11-22)
- A1. Single community per install.
- A2. Access is group-based. Each gated item (course, board, event) is visible to one or more groups. A plan grants one or more groups. Admins can also add or remove group membership by hand.
- A3. Course → modules → lessons. A lesson has a Mux video, Markdown body and transcript. Members can mark lessons complete.
- A4. Mux playback is signed: only members with access can stream.
- A5. Stripe Checkout for payment, Stripe Customer Portal for billing self-service. Stripe webhooks are the source of truth for access changes.
- A6. Board: image and text posts, comments. Authors edit and delete their own posts and comments. Admins delete any post or comment and can pin posts.
- A7. Events: title, description, start time with time zone, Zoom link, visible to chosen groups.
- A8. Admin-created API keys. The API covers all admin actions plus bulk import. It has an OpenAPI document.
- A9. Self-hosters configure SMTP for transactional email.
- A10. One umbrella spec. mt-plan slices it into waves.
- A11. SQLite in a single container with one data volume (database plus uploaded images).
- A12. Login by magic link, plus an optional password.

## User stories
- US-1. As a visitor, I can see the available plans and sign up and pay, so that I get access to the community.
- US-2. As a member, I can log in by magic link or password, so that I can get back in easily.
- US-3. As a member, I can manage my billing (card, cancel) without contacting the admin.
- US-4. As a member, I can watch lessons, read the text and transcript, and track my progress through a course.
- US-5. As a member, I can post an image with text on a board I have access to, and comment on and like others' posts.
- US-6. As a member, I can see upcoming events I'm eligible for and join through the Zoom link.
- US-7. As an admin, I can set up plans, groups, courses, boards and events, and manage members, in a minimal admin area.
- US-8. As an admin (or Claude Code acting for me), I can do all of the above through an authenticated API.
- US-9. As an existing Circle member, I can claim my new account with my email and find my access already in place, without paying again.
- US-10. As the admin, I can migrate members, subscriptions and course content from Circle with a dry run first, and see exactly what will happen before committing.
- US-11. As a self-hoster, I can run the platform from one Docker image with documented environment variables.

## Functional requirements

### FR-1 Accounts & authentication
- FR-1.1 Sign-up with email. Login by magic link (single-use, expires after 15 minutes) or by password if the member has set one.
- FR-1.2 Members can set or change a password and request a password reset.
- FR-1.3 Roles: `admin` and `member`. Admins bypass group gating. The first account created on a fresh install becomes an admin (setup flow).
- FR-1.4 A member profile has a display name and an optional avatar image.
- FR-1.5 Admins can deactivate a member, which revokes all sessions and access immediately.

### FR-2 Plans, payments & access
- FR-2.1 The admin defines plans: name, description, type (`one_off` | `recurring`), the Stripe Price ID(s) the plan corresponds to, the groups it grants, and whether the plan is publicly listed.
- FR-2.2 Public pricing page lists the listed plans. Choosing one starts Stripe Checkout. The account is created or linked by the email used at checkout.
- FR-2.3 Access is driven by Stripe webhooks (verified signatures, idempotent processing):
  - `one_off` paid → grant the plan's groups with no expiry.
  - recurring `active` or `trialing` → grant the groups.
  - `past_due` → keep access (Stripe retries).
  - `canceled`, `unpaid` or `incomplete_expired` → revoke groups that came from that subscription.
  - A cancellation scheduled for period end keeps access until the period ends.
  - A full refund of a one-off payment → revoke groups from that purchase.
- FR-2.4 Members open the Stripe Customer Portal from their account page.
- FR-2.5 Group memberships record their source (`plan:<id>` or `manual`). Revoking a plan's access never removes a manually granted membership, and vice versa.
- FR-2.6 A member with access through several sources keeps it until every source is gone.

### FR-3 Groups & gating
- FR-3.1 The admin creates, renames and deletes groups. Deleting a group in use requires confirmation and removes it from all gated items.
- FR-3.2 Each course, board and event has a list of groups that can see it. An empty list means admins only.
- FR-3.3 Gated items the member cannot access are not shown in navigation. Direct URLs return a "no access" page offering the plans that would grant access.

### FR-4 Courses
- FR-4.1 A course has a title, description, cover image, ordered modules, and access groups.
- FR-4.2 A lesson has a title, a Markdown body, a Mux asset (playback ID), a transcript (plain text or WebVTT), and an order within its module.
- FR-4.3 The lesson page shows a signed Mux player, the body, and the transcript (collapsible). If WebVTT is supplied, it is used as captions.
- FR-4.4 Members can mark lessons complete or incomplete. The course page shows progress (completed / total).
- FR-4.5 Admins can create and edit courses, modules and lessons in the admin area, including uploading a video to Mux (direct upload) or attaching an existing Mux asset.

### FR-5 Notice board
- FR-5.1 There are one or more boards, each with access groups. Launch creates a default "General" board.
- FR-5.2 Members with access can create a post: text (Markdown, required) and up to 4 images (JPEG, PNG, WebP or GIF, 10 MB each).
- FR-5.3 Members can comment on posts (flat, not threaded) in text only.
- FR-5.4 Authors can edit and delete their own posts and comments. Admins can delete any post or comment and pin or unpin posts. Pinned posts show first, then newest first.
- FR-5.5 Images are stored on the data volume and served only to members with access to that board.
- FR-5.6 Members with access can like or unlike posts and comments (one like per member per item). The like count is shown on each post and comment. No other reaction types at launch.

### FR-6 Events
- FR-6.1 An event has a title, description, start time with time zone, optional end time, Zoom URL, and access groups.
- FR-6.2 The events page lists upcoming events (in the member's local time zone) and past events separately.
- FR-6.3 The Zoom link is shown only to members with access.

### FR-7 Admin area (minimal)
- FR-7.1 CRUD for plans, groups, courses/modules/lessons, boards and events.
- FR-7.2 Member list with search by email or name, showing each member's groups (and their sources) and Stripe status. Admins can add or remove manual groups and deactivate members.
- FR-7.3 API key management: create (shown once), name, last-used time, revoke.
- FR-7.4 Settings: community name, logo, and a read-only status of required environment configuration (Stripe, Mux, SMTP). Settings never display secrets.
- FR-7.5 The migration tool is driven through the API and CLI, not the admin UI. The admin UI shows a read-only migration report.

### FR-8 API
- FR-8.1 REST under `/api/v1`, JSON, authenticated by `Authorization: Bearer <api_key>`. Keys have admin scope at launch.
- FR-8.2 Resources: plans, groups, members (including group membership), courses, modules, lessons (including Mux upload URLs), boards, posts, comments, events, and migration jobs.
- FR-8.3 OpenAPI 3.1 document at `/api/v1/openapi.json`.
- FR-8.4 Consistent error format: `{ error: { code, message, details? } }`. Lists are paginated with cursors.
- FR-8.5 Bulk endpoints for importing courses (modules, lessons and transcripts in one payload), idempotent by caller-supplied `external_id`.

### FR-9 Circle → platform migration
- FR-9.1 **Plan mapping:** before import, the admin maps each existing Stripe Price ID to a plan (and therefore to groups). Unmapped prices block a commit.
- FR-9.2 **Subscription import (dry run first):** read the existing Stripe customers and subscriptions (statuses active, trialing, past_due, plus cancellations scheduled for period end). For each one:
  - match or create an unclaimed member by the Stripe customer email
  - link the Stripe customer ID and subscription ID
  - grant groups through the mapped plan
- FR-9.3 **Dry run report:** counts of members to create, members to link, subscriptions per plan, plus lists of unmapped prices, duplicate emails, and customers with no email. Nothing is written in a dry run.
- FR-9.4 **Commit** applies the dry-run result. It is idempotent: re-running creates no duplicates and only applies differences.
- FR-9.5 **Migration never writes to Stripe:** it creates no subscriptions, and never updates, cancels or charges existing ones. It only reads.
- FR-9.6 **Non-Stripe members:** members from a Circle member CSV export who have no Stripe subscription (comped or one-off) can be imported with manual group assignments.
- FR-9.7 **Account claim:** an unclaimed member who requests a magic link with their email gets in, and their access is already present. Optional: the admin triggers a "your new home" invite email to all unclaimed members.
- FR-9.8 **Content import:** courses, modules, lessons and transcripts are imported through the bulk API. Videos are attached as Mux assets (created from a source URL or uploaded file).

### FR-10 Deployment
- FR-10.1 A single Docker image. All state lives in one mounted data volume (SQLite database and uploads).
- FR-10.2 Configuration by environment variables: base URL, secret key, Stripe keys and webhook secret, Mux token and signing keys, SMTP. Missing required config yields a clear startup error naming the variable.
- FR-10.3 Database migrations run automatically on start.
- FR-10.4 Health endpoint at `/healthz`.
- FR-10.5 The README documents deploy, backup (copying the volume / SQLite backup) and upgrade.

## Acceptance criteria (Given / When / Then)

### Auth
- **AC-1** Given a fresh install with no users, when someone opens the site, then they are taken to setup, and the account they create is an admin. After that, setup is no longer reachable.
- **AC-2** Given a registered member, when they request a magic link and open it within 15 minutes, then they are logged in. Opening the same link again fails.
- **AC-3** Given a magic link older than 15 minutes, when it is opened, then login fails with a message offering a new link.
- **AC-4** Given a member with a password set, when they log in with the correct password, then they are logged in. Five failed attempts within 15 minutes rate-limit further attempts for that email and IP.
- **AC-5** Given an admin deactivates a member, when that member makes their next request, then their session is invalid and they cannot log in.

### Payments & access
- **AC-6** Given a listed recurring plan granting group G, when a visitor completes Stripe Checkout, then an account exists for their email, they are in G (source `plan`), and they can open a course gated to G.
- **AC-7** Given a listed one-off plan granting G, when checkout completes, then the member is in G with no expiry.
- **AC-8** Given a member whose subscription becomes `canceled`, when the webhook is processed, then the groups from that subscription are removed and gated content returns "no access".
- **AC-9** Given a subscription set to cancel at period end, when the webhook arrives, then access stays until the period end, then is removed.
- **AC-10** Given a subscription goes `past_due`, then access is kept.
- **AC-11** Given a member in G through both a plan and a manual grant, when the plan's subscription is canceled, then they remain in G (manual source).
- **AC-12** Given the same Stripe webhook event is delivered twice, then it is applied once.
- **AC-13** Given a webhook with an invalid signature, then it is rejected with 400 and nothing changes.
- **AC-14** Given a member, when they click "Manage billing", then they land in the Stripe Customer Portal for their customer.
- **AC-15** Given a one-off payment is fully refunded, when the webhook is processed, then the groups from that purchase are removed.

### Gating
- **AC-16** Given a member not in any of a course's groups, then the course does not appear in navigation. Visiting its URL shows "no access" with the plans that grant it.
- **AC-17** Given an item with no access groups, then only admins can see it.
- **AC-18** Given a member without access to a lesson, when they request a Mux playback token or the video URL for that lesson, then they are refused (no signed token is issued).

### Courses
- **AC-19** Given a lesson with a Mux asset and a WebVTT transcript, when a member with access opens it, then the video plays with captions, and the transcript and body are shown.
- **AC-20** Given a member marks lessons complete, then course progress shows completed / total, and the progress persists across sessions.
- **AC-21** Given an admin uploads a video file in the lesson editor, then it is sent to Mux, and the lesson becomes playable once Mux reports the asset as ready.

### Board
- **AC-22** Given a member with access to a board, when they post text with up to 4 valid images, then the post appears at the top (below pinned posts) for all members with access.
- **AC-23** Given an image over 10 MB, a fifth image, or a non-image file, then the post is rejected with a clear message and nothing is saved.
- **AC-24** Given a member, when they edit or delete their own post or comment, then the change is shown. They cannot edit or delete others' posts or comments.
- **AC-25** Given an admin, when they pin a post, then it shows above unpinned posts. When they delete any post, then it and its comments are gone.
- **AC-26** Given someone without board access requests a board image URL directly, then it is refused.
- **AC-46** Given a member with board access, when they like a post or comment, then its count goes up by 1. Liking again (unlike) brings it back down. A member can't add more than one like to the same item. The API exposes the same like and unlike actions.

### Events
- **AC-27** Given an upcoming event gated to G, then members of G see it with the start time in their local time zone and the Zoom link. Others see neither the event nor the link.
- **AC-28** Given an event's start (or end) time has passed, then it moves to past events.

### Admin
- **AC-29** Given an admin, they can create, edit and delete plans, groups, courses, modules, lessons, boards and events from the admin area.
- **AC-30** Given an admin searches members by email or name, then results show each member's groups with sources and their Stripe subscription status.
- **AC-31** Given an admin creates an API key, then the full key is shown once only. Afterwards only its name, prefix and last-used time are visible. Revoking it makes requests with it fail with 401.

### API
- **AC-32** Given a valid API key, then every admin action in FR-7.1/FR-7.2 has an equivalent API endpoint, documented in `/api/v1/openapi.json`.
- **AC-33** Given no key or an invalid key, then API requests return 401 in the standard error format.
- **AC-34** Given a bulk course import with `external_id`s, when the same payload is sent twice, then no duplicates are created, and changed fields are updated.

### Migration
- **AC-35** Given Stripe (test mode) has subscriptions on prices P1 and P2, and only P1 is mapped, when a dry run runs, then the report lists P2 as unmapped, and commit is blocked.
- **AC-36** Given all prices are mapped, when a dry run runs, then the report shows the counts of members to create or link and of subscriptions per plan. The database is unchanged.
- **AC-37** Given a committed migration, when it is run again, then no duplicate members, memberships or links are created.
- **AC-38** Given a migration run (dry run or commit), then no write calls are made to Stripe (verified by test: the Stripe client in migration is read-only).
- **AC-39** Given a migrated, unclaimed member, when they request a magic link with their Stripe email, then they log in and already have their plan's groups, with no checkout required.
- **AC-40** Given a migrated member's subscription is later canceled in Stripe, then the webhook revokes their access exactly as for a native member (AC-8).
- **AC-41** Given a Circle CSV row for a member with no Stripe subscription and a manual group mapping, when imported, then that member exists unclaimed with manual group membership.
- **AC-42** Given duplicate emails across Stripe customers, then the dry run lists them, and commit links all of that email's subscriptions to one member.

### Deployment
- **AC-43** Given the Docker image and a volume, with all required environment variables set, when the container starts, then migrations run, `/healthz` returns 200, and the setup page is reachable.
- **AC-44** Given a required environment variable is missing, when the container starts, then it exits with an error naming the variable.
- **AC-45** Given the container is recreated with the same volume, then all data and uploads persist.

## Data model & API shape
Entities (logical; the physical schema is mt-plan's call):
- **Member**: id, email (unique), name, avatar, role (`admin` | `member`), password_hash?, status (`active` | `deactivated`), claimed_at?, stripe_customer_id?
- **Group**: id, name
- **GroupMembership**: member_id, group_id, source (`plan` | `manual`), source_ref (subscription/payment ID or admin ID), expires_at?
- **Plan**: id, name, description, type (`one_off` | `recurring`), stripe_price_ids[], group_ids[], listed
- **Purchase**: id, member_id, plan_id, stripe_subscription_id? / stripe_payment_intent_id?, status, current_period_end?, cancel_at_period_end
- **Course** → **Module** → **Lesson**: title, order, body_md, mux_asset_id, mux_playback_id, transcript (text or VTT), external_id?. Course has access group_ids[].
- **LessonCompletion**: member_id, lesson_id, completed_at
- **Board**: id, name, access group_ids[]
- **Post**: id, board_id, author_id, body_md, images[], pinned, timestamps
- **Comment**: id, post_id, author_id, body, timestamps
- **Like**: member_id, target_type (`post` | `comment`), target_id, created_at (unique per member and target)
- **Event**: id, title, description, starts_at, ends_at?, timezone, zoom_url, access group_ids[]
- **ApiKey**: id, name, prefix, hash, last_used_at, revoked_at?
- **WebhookEvent**: stripe_event_id (unique), processed_at (for idempotency)
- **MigrationRun**: id, mode (`dry_run` | `commit`), report JSON, created_at

API: `/api/v1/{plans,groups,members,members/{id}/groups,courses,modules,lessons,lessons/{id}/mux-upload,boards,posts,comments,likes,events,import/courses,migrations}` with standard GET/POST/PATCH/DELETE. `POST /api/v1/migrations {mode, price_map, circle_csv?}` returns the report.

## UX notes
- No `brand.md` or `design.md` yet. Use a clean, neutral default theme. The community name and logo come from settings.
- Member navigation: Courses, Board(s), Events, Account. Only accessible items are shown.
- The admin area is functional, not polished: tables and forms.
- Mobile-responsive member pages are required. The admin area only needs to be usable on desktop.

## Edge cases & error states
- Checkout completed, but the webhook is delayed: the success page shows "finishing setup" and polls, so access appears when the webhook lands.
- Checkout with an email that already has an account: link the purchase to the existing member.
- A member's Stripe email differs from their login email: the admin can relink the Stripe customer to a member.
- A plan is deleted while members hold it: blocked. Plans can be unlisted, but not deleted while purchases reference them.
- A Mux asset is still processing: the lesson shows "video processing".
- A Mux asset errors: the admin sees the error on the lesson.
- Lesson with no video: the page shows only the body and transcript.
- Uploaded image is corrupt or has a wrong extension: rejected (content is checked, not just the extension).
- An event has no end time: it moves to past events at its start time + 2 hours.
- Last admin tries to demote or deactivate themselves: blocked.
- SMTP misconfigured: the magic-link request shows a generic error, and the admin settings page flags SMTP as failing.

## Non-functional requirements
- **Security:** HTTPS assumed (reverse proxy). Secure, HttpOnly, SameSite cookies, and CSRF protection on forms. Passwords hashed with argon2id or bcrypt. API keys stored hashed. Stripe webhook signatures verified. Mux playback signed with short-lived tokens. Uploads served through authorised routes. Rate limits on auth endpoints and the API. Secrets never logged or shown.
- **Privacy:** member emails are visible only to admins. Board posts show the display name and avatar.
- **Performance:** on a 1 vCPU / 1 GB VPS with 1,000 members, member pages respond in under 500 ms (p95, excluding video).
- **Accessibility:** WCAG 2.2 AA for member pages: keyboard navigable, labelled forms, captions available when VTT is supplied.
- **Reliability:** webhook handling is idempotent and safe to replay. The SQLite database runs in WAL mode, and backup is documented.
- **Open source:** MIT licence file. No proprietary services required beyond Stripe, Mux and SMTP, each configured by the self-hoster.

## Testing approach
- **Unit:** access-rule engine (sources, expiry, multiple sources), webhook-to-state transitions (each status), migration mapping and dedupe logic, upload validation, API key hashing.
- **Integration:** Stripe test mode with replayed webhook fixtures and the Stripe CLI for checkout, cancel, refund, past_due and duplicate delivery. Mux in test or a stubbed client for token signing and upload. API endpoints against a temporary SQLite database. Migration dry run and commit against Stripe test-mode fixtures, including a guard test that the migration Stripe client makes no write calls (AC-38).
- **End-to-end (Playwright):** setup → create plan → visitor checkout (Stripe test) → access course → post on board. Migrated member claim flow. Gating ("no access").
- **Manual:** a cutover rehearsal in Stripe test mode mirroring the live price structure, and the real Circle export walk-through. Checking a Docker deploy on a clean VPS.

## Boundaries
- **Always:** use Stripe test mode in development and tests. Verify webhook signatures. Keep migration read-only towards Stripe. Run the dry run before any commit. Keep every admin action reachable through the API.
- **Ask first:** any action against **live** Stripe (including running the migration on live data); disconnecting Circle from Stripe; schema changes after the plan is approved; adding a new external service or significant dependency; changing the auth model.
- **Never:** create, modify, cancel or charge existing live subscriptions from code; commit secrets or `.env` files; log secrets or full API keys; expose Zoom links, videos or images to members without access.

## Open questions
- OQ-1. **What can Circle export?** (Members CSV? Video files? Transcripts? Lesson text?) This determines the content import path. To confirm with a real export.
- OQ-2. **How does Circle use your Stripe account?** Does it hold the subscriptions directly in your account (likely, since you have "100 through Stripe"), or through Stripe Connect? What does disconnecting Circle do to those subscriptions? Confirm before the cutover, ideally in a test-mode rehearsal or with Circle support. (Riskiest unknown.)
- OQ-3. **Circle-side webhooks and automations:** during cutover, could Circle react to Stripe events (for example, revoke access in Circle)? Harmless once Circle is cancelled, but the order of steps matters: platform live → members claim → disconnect Circle.
- OQ-4. **Existing Stripe price → group mapping** for Switch Dimension: which prices exist today, and what should each grant?
- OQ-5. **One-off or lifetime members on Circle:** are they identifiable in Stripe (payments with no subscription), or only from Circle's CSV? FR-9.6 covers the CSV path.
- OQ-6. **SMTP provider** for Switch Dimension's own install (for example Resend, Postmark or SES via SMTP).
