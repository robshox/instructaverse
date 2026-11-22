## Molten Loop skills

This project uses the Molten Loop agent skills (`mt-*`). Their output lives in `molten-docs/`.

- **Not sure what's next?** Run **mt-guide**. It reads `molten-docs/` and recommends the next skill.
- **Building a feature:** follow the Agent Development Loop: **mt-discovery** → **mt-spec** → **mt-plan** → **mt-build** → **mt-verify** → **mt-review** → **mt-ship**. **mt-prototype** is an optional step before the spec. For anything bigger than a tiny fix, don't skip the spec or plan without asking.
- **The spec is the contract.** Each piece of work has a folder, `molten-docs/loop/<slug>/`, with its docs numbered in loop order. Read its spec (`03-spec.md`) and plan (`04-plan.md`) before working on it. If scope changes, update the spec first.
- **Use the skill, not a freehand version of it.** When a task matches an `mt-*` skill (validating an idea, branding, design, a landing page, a spec, a review, shipping), load that skill and follow it.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
