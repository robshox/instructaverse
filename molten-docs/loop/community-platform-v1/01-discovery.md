---
feature: Course & community platform v1 (Circle replacement)
slug: community-platform-v1
created: 2026-11-21
molten_next_skill: mt-spec
---

# Discovery — Course & community platform v1 (Circle replacement)

## Problem
Rob runs the Switch Dimension course and community on Circle (circle.so). It is too expensive and doesn't do exactly what he wants. He wants his own course-and-community platform, released as an MIT-licensed open-source project that anyone can self-host for their own course.

## Users & context
- **Owner/admin (first user: Rob, Switch Dimension):** sets up plans, member groups, courses and events; moderates the community. Manages heavy work through the API and Claude Code.
- **Members:** about 100 paying members today, on Circle, billed through Rob's own Stripe account. They watch course videos, read transcripts and lesson text, post and comment on the notice board, and join events.
- **Self-hosters (later):** other course creators who install the platform on their own VPS.
- **Today's alternative:** Circle (and similar tools like Skool), which cost too much and fit poorly.

## Desired outcome / success signals
- Switch Dimension's members and content are fully moved off Circle, and the Circle subscription is cancelled.
- All existing paying members keep their access and billing with no re-payment, no double charges and no lapsed access.
- Members use the new platform for courses and the notice board.
- Another person can deploy the platform from a single Docker image.

## Key flows
**Happy path (launch)**
1. A visitor signs up, picks a plan (one-off or recurring), and pays via Stripe Checkout.
2. Payment puts them in the member group(s) tied to that plan, which unlocks the matching areas and courses.
3. A member watches video lessons (Mux) with lesson text and transcripts.
4. A member posts an image with text on the notice board, and others comment.
5. A member sees upcoming events and joins through the external Zoom link.
6. The admin manages plans, groups, courses and events through a minimal admin area, or through the API (for example from Claude Code).

**Migration (one-off, at launch)**
1. Existing Stripe customers and subscriptions are matched to new member accounts, and each subscription is mapped to the right group(s).
2. Members claim their accounts (for example by email login or reset) without paying again.
3. Course content (lessons, text, transcripts) is imported, and videos are moved from Circle to Mux.

**Most likely failure**
- During the Stripe cutover, a subscription doesn't map to a member or group. The member is either charged with no access, or keeps access with no billing. Both Circle and the new platform could also act on the same subscription at once (double charge, or a cancellation triggered by one side).

## Constraints
- **Licence:** MIT and open source, so there can be no proprietary lock-in in the core.
- **Deployment:** a single Docker image that runs on any VPS. Every external service must be configurable by self-hosters.
- **Payments:** Stripe, with one-off and recurring plans and multiple plan options.
- **Video:** Mux. Self-hosters supply their own Mux keys.
- **Transcripts:** already exist, so they are imported, not generated.
- **Events:** Zoom links only, with no Zoom integration.
- **Admin:** a minimal in-app admin. The API is a launch feature and covers bulk and heavy operations.
- **Deadline:** none. Circle keeps running until the cutover is proven.

## Out of scope (launch)
- AI course tutor/agent (later release)
- Quizzes and certificates (later release)
- MCP server (later release, and will build on the API)
- Full-featured admin UI (only a minimal admin area at launch)
- Zoom integration beyond links
- Transcript generation

## Codebase context (files, patterns, services to reuse)
- Greenfield: the repo contains only the Molten Loop setup (`.claude/skills/`, `AGENTS.md`, `CLAUDE.md`). There is no application code yet.
- Existing services to reuse: Rob's Stripe account (with the current customers and subscriptions) and a Mux account (to be set up for video).

## Facts / Assumptions / Open questions
**Facts**
- There are about 100 paying members, and their subscriptions run through Rob's own Stripe account.
- Course videos currently live on Circle.
- Transcripts already exist.
- Members and content must both be migrated.
- The launch scope is fixed as listed above, and admin is minimal plus the API (option 4b).

**Assumptions**
- Circle can be disconnected from the Stripe account without cancelling the underlying subscriptions.
- Members can be matched across Circle and Stripe by email.
- Stripe Checkout and the Customer Portal are acceptable for payment and plan management.

**Open questions**
- What does Circle let you export: members, video files, transcripts, posts? In what format, and how complete?
- Do existing notice-board posts and comments need migrating, or can the board start fresh?
- How do current Stripe products and prices map to the new plans and member groups?
- What happens to Circle's webhooks and its link to the subscriptions during the cutover? How do we avoid both systems acting at once?
- Login method: email and password, magic link, or both?
- Database choice for a single-container deployment (for example SQLite or bundled Postgres) — to settle in the spec.

## Riskiest unknown
**The Stripe cutover (data and third-party).** About 100 live subscriptions must move from Circle-managed to platform-managed. Each one must map to the right member groups, billing must continue, there must be no double charges or lapsed access, and Circle must not cancel or modify subscriptions when it is disconnected. Second risk: whether Circle's export (especially video files) is usable.

## Recommended next step
**mt-spec.** Turn this into a testable spec. Given the size, the spec may split launch into features (for example auth and billing, courses, notice board, events, API, migration), with the Stripe cutover specced in detail with acceptance criteria. Optional: an **mt-prototype** technical spike against Stripe test mode to prove the subscription mapping and the Circle-disconnect behaviour before building billing.
