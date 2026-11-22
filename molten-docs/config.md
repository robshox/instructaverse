---
issue_tracker: linear
tracker_sync: true            # false = keep tasks in the plan only
linear:
  team: SWI (Switch Dimension)
  project: Instructaverse
statuses:                     # exact names in this tracker
  todo: Todo
  in_progress: In Progress
  done: Done
label: molten                 # applied to every issue Molten creates
---

# Molten config

Code lives at https://github.com/robshox/instructaverse (public). Tasks are tracked in Linear, project **Instructaverse** (https://linear.app/switch-dimension/project/instructaverse-42287ec20527).

## Tracker operations

Linear, through the Linear MCP connector (available through the Executor app as `tools.linear.mcp.*`).

- **create:** `save_issue` with `team: "SWI"`, `project: "Instructaverse"`, `labels: ["molten"]`, `state: "Todo"`. Set `parentId` to the feature parent for task issues.
- **block:** `save_issue` on the task with `blockedBy: [<dependency identifiers>]`. The links are append-only.
- **start:** `save_issue` with `state: "In Progress"`, `assignee: "me"`.
- **finish:** `save_issue` with `state: "Done"`, then `save_comment` with the commit or PR link and the verify result.
- **comment:** `save_comment` on the issue.
- **read status:** `get_issue` (with `includeRelations: true` for blockers) and read `status` and `assignee`.
- Branch names and commits include the issue key (e.g. `SWI-199`) so Linear links them automatically. Linear also suggests a `gitBranchName` for each issue.
- Note: `save_issue` responses put the identifier in `id` (e.g. `SWI-199`), not in `identifier`.
