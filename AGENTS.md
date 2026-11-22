## Molten Loop skills

This project uses the Molten Loop agent skills (`mt-*`). Their output lives in `molten-docs/`.

- **Not sure what's next?** Run **mt-guide**. It reads `molten-docs/` and recommends the next skill.
- **Building a feature:** follow the Agent Development Loop: **mt-discovery** → **mt-spec** → **mt-plan** → **mt-build** → **mt-verify** → **mt-review** → **mt-ship**. **mt-prototype** is an optional step before the spec. For anything bigger than a tiny fix, don't skip the spec or plan without asking.
- **The spec is the contract.** Each piece of work has a folder, `molten-docs/loop/<slug>/`, with its docs numbered in loop order. Read its spec (`03-spec.md`) and plan (`04-plan.md`) before working on it. If scope changes, update the spec first.
- **Use the skill, not a freehand version of it.** When a task matches an `mt-*` skill (validating an idea, branding, design, a landing page, a spec, a review, shipping), load that skill and follow it.
