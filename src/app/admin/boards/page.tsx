import { Icon } from "@/components/icon";
import { SortableList } from "@/components/sortable-list";
import { Card, Eyebrow, pillClass, Tag } from "@/components/ui";
import { listGroups } from "@/lib/access";
import { boardsWithCounts } from "@/lib/community/boards";
import { requireAdmin } from "@/lib/session";
import { reorderBoardsAction } from "../reorder-actions";
import { deleteBoardAction } from "./actions";
import { BoardForm } from "./board-form";

export const metadata = { title: "Boards · Admin" };

/** Admin boards (FR-9.7, AC-28). */
export default async function AdminBoardsPage() {
  const admin = await requireAdmin();
  const [boards, groups] = await Promise.all([boardsWithCounts(admin), listGroups()]);
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <main className="flex flex-col gap-7">
      <div>
        <Eyebrow>
          Admin <b className="font-normal text-accent">·</b> Community
        </Eyebrow>
        <h1 className="mt-2 text-[34px] leading-[1.1] font-medium tracking-[-.035em]">Boards</h1>
        <p className="mt-1.5 text-sm text-muted">Drag to set the order members see in the board sidebar.</p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          {boards.length ? (
            <SortableList
              label="Boards"
              onReorder={reorderBoardsAction}
              itemClassName="items-start border-b border-line px-4 py-3.5 last:border-0 hover:bg-raised [&>span:first-child]:pt-1"
              items={boards.map((b) => ({
                id: b.id,
                label: b.name,
                content: (
                  <details className="group">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 [&::-webkit-details-marker]:hidden">
                      <span className="font-medium">{b.name}</span>
                      <span className="flex flex-wrap gap-1.5">
                        {b.groupIds.length ? (
                          b.groupIds.map((id) => <Tag key={id}>{groupName.get(id) ?? "Unknown group"}</Tag>)
                        ) : (
                          <Tag tone="dim">Admins only</Tag>
                        )}
                      </span>
                      <span className="ml-auto font-mono text-xs text-dim">
                        {b.postCount} {b.postCount === 1 ? "post" : "posts"}
                      </span>
                      <span className={pillClass("secondary", "sm")}>
                        <Icon name="pencil" size={13} /> Edit
                      </span>
                    </summary>
                    <div className="mt-4 flex flex-col gap-5 border-t border-line pt-4">
                      <BoardForm board={b} groups={groups} />
                      <form action={deleteBoardAction} className="flex flex-wrap items-center gap-3 text-sm text-muted">
                        <input type="hidden" name="id" value={b.id} />
                        <label className="flex items-center gap-2">
                          <input type="checkbox" name="confirm" value="yes" required />
                          Delete &ldquo;{b.name}&rdquo; and all its posts
                        </label>
                        <button className={pillClass("danger", "sm")}>Delete board</button>
                      </form>
                    </div>
                  </details>
                ),
              }))}
            />
          ) : (
            <p className="p-6 text-muted">No boards yet.</p>
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <Eyebrow accent="New board" />
          <BoardForm groups={groups} />
        </Card>
      </div>
    </main>
  );
}
