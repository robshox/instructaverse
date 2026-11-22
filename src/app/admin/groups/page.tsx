import { listGroups } from "@/lib/access";
import { requireAdmin } from "@/lib/session";
import { CreateGroupForm, GroupRow } from "./group-forms";

export const metadata = { title: "Groups · Admin" };

export default async function GroupsPage() {
  // Each admin page guards itself (the layout gate is a second line), which also
  // keeps the page dynamic so it's never prerendered at build time.
  await requireAdmin();
  const groups = await listGroups();
  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Groups</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Groups decide who can see each course, board and event. Plans add members to groups automatically; you can
          also add people by hand.
        </p>
      </div>
      <CreateGroupForm />
      {groups.length === 0 ? (
        <p className="text-sm text-zinc-500">No groups yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {groups.map((g) => (
            <GroupRow key={g.id} {...g} />
          ))}
        </ul>
      )}
    </main>
  );
}
