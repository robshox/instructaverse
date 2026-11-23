---
feature: Switch Dimension redesign
slug: switch-dimension-redesign
created: 2026-11-22
spec: molten-docs/loop/switch-dimension-redesign/03-spec.md
result: pr-open
pr: https://github.com/robshox/instructaverse/pull/1
---

# Ship — Switch Dimension redesign

## Readiness (review, verify, plan, branch status)
- Review: `approve-with-suggestions` after loop-back 1 (06-review.md); both blockers resolved in 0ee82fd.
- Verify: `partial`, **environment only** (real Stripe and Mux needed for AC-17/22/23/26 details, already tracked as SWI-230 and SWI-231). The skill expects `pass`; mt-auto's routing allows an environment-only partial to continue, and the PR lists the gap. Code changed after the first verify (the review fixes) was re-verified, and the gates below ran on the final commit.
- Plan: `status: done`. Plan tasks SWI-245–SWI-263 and the review fix SWI-273 are Done in Linear. Two issues found during the run stay open under SWI-244 because they're outside this change's scope: SWI-265 and SWI-272.
- Branch: `feat/switch-dimension-redesign`, stacked on `feat/SWI-198-community-platform-v1` (decision 2). The base has not moved (692d619 is an ancestor of HEAD), so no merge was needed. Built sequentially, so there are no worktrees or task branches. No database branch (no schema changes).

## Tidy (what was cleaned up)
- `git status` clean. No `console.log`, `debugger`, `.only`/`.skip` or new TODOs in the diff. Only `src/` and `molten-docs/` changed; no `.env` files, binaries or generated files.
- Commit history left as is (auto mode): 19 task commits, one verify fix, one review-fix commit, plus run-log commits. Offers I'd have made with a person present: squashing the run-log commits into one docs commit; deleting the branch after merge.

## Gates
Final commit 0353a37.

| Gate | Command | Result |
| --- | --- | --- |
| Build | `npm run build` | pass |
| Tests | `npx vitest run` | pass: 192 in 40 files, none skipped (152 before the redesign) |
| Lint | `npm run lint` | pass |
| Type-check | `npm run typecheck` | pass |
| Secrets | `gitleaks git --log-opts="feat/SWI-198-community-platform-v1..HEAD"` | pass: no leaks |
| Dependencies | `git diff … -- package.json package-lock.json` | n/a: no dependency changes |
| Docker | `docker build -t instructaverse:redesign-ship .` | pass. The Checkpoint 4 image was also run: runtime brand applied, fonts served |

## Docs and release (README, .env.example, CHANGELOG, version)
- The repo has no README, `.env.example` or CHANGELOG yet; self-hosting docs are part of the deferred Phases 5–7. The new optional variables (`BRAND_NAME`, `BRAND_LOGO_URL`, `BRAND_TAGLINE`) are documented in `src/lib/brand.ts`, the spec and the PR body. Offers I'd have made with a person present: create `CHANGELOG.md` (Keep a Changelog) and a `.env.example` listing every variable, including these three.
- No version bump (the project doesn't version releases).

## Pull request (link, CI result, preview URL and deploy result)
- https://github.com/robshox/instructaverse/pull/1, base `feat/SWI-198-community-platform-v1`. Not merged.
- CI: n/a (no workflows in the repo).
- Preview deploy: n/a (no preview deployments configured). The local standalone demo on :3917 runs the final build.

## Rollout and rollback
Not a production deploy: the PR targets a feature branch. When it does reach production, roll back by reverting the merge. There are no migrations or data changes; the new reorder actions only rewrite `position` on existing rows.
