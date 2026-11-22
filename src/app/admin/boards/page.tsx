import { listGroups } from "@/lib/access";
import { listBoards } from "@/lib/community/boards";
import { requireAdmin } from "@/lib/session";
import { deleteBoardAction } from "./actions";
import { BoardForm } from "./board-form";

export const metadata = { title: "Boards · Admin" };

export default async function AdminBoardsPage() {
  await requireAdmin();
  const [boards, groups] = await Promise.all([listBoards(), listGroups()]);
  return (
    <main className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Boards</h1>
      {boards.map((b) => (
        <details key={b.id} className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <summary className="cursor-pointer font-medium">
            {b.name} <span className="text-sm font-normal text-zinc-500">· {b.groupIds.length ? `${b.groupIds.length} group(s)` : "Admins only"}</span>
          </summary>
          <div className="mt-4 flex flex-col gap-6">
            <BoardForm board={b} groups={groups} />
            <form action={deleteBoardAction} className="flex flex-wrap items-center gap-3 text-sm">
              <input type="hidden" name="id" value={b.id} />
              <label className="flex items-center gap-2">
                <input type="checkbox" name="confirm" value="yes" required />
                Delete &ldquo;{b.name}&rdquo; and all its posts
              </label>
              <button className="rounded-md bg-red-700 px-3 py-1.5 font-medium text-white">Delete board</button>
            </form>
          </div>
        </details>
      ))}
      <section className="flex max-w-md flex-col gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">New board</h2>
        <BoardForm groups={groups} />
      </section>
    </main>
  );
}
