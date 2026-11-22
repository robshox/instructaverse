import { Card, Eyebrow } from "@/components/ui";
import { listGroups } from "@/lib/access";
import { groupUsage } from "@/lib/access/usage";
import { requireAdmin } from "@/lib/session";
import { CreateGroupForm, GroupRow } from "./group-forms";

export const metadata = { title: "Groups · Admin" };

/** Groups (FR-9.6, AC-32). */
export default async function GroupsPage() {
  // Each admin page guards itself (the layout gate is a second line), which also
  // keeps the page dynamic so it's never prerendered at build time.
  await requireAdmin();
  const [groups, usage] = await Promise.all([listGroups(), groupUsage()]);
  return (
    <main className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>
            Admin <b className="font-normal text-accent">·</b> Access
          </Eyebrow>
          <h1 className="mt-2 text-[34px] leading-[1.1] font-medium tracking-[-.035em]">Groups</h1>
          <p className="mt-1.5 max-w-[520px] text-sm text-muted">
            Groups decide who sees each course, board and event. Plans add buyers automatically; you can add people by hand too.
          </p>
        </div>
        <CreateGroupForm />
      </div>
      {groups.length === 0 ? (
        <Card className="p-6 text-muted">No groups yet.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[11px] tracking-[.06em] text-dim uppercase">
                <th className="px-5 py-3 font-normal">Group</th>
                <th className="px-5 py-3 font-normal">Members</th>
                <th className="px-5 py-3 font-normal">Used by</th>
                <th className="px-5 py-3 font-normal">Granted by</th>
                <th className="px-5 py-3 font-normal">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <GroupRow key={g.id} {...g} usage={usage.get(g.id) ?? { courses: 0, boards: 0, events: 0, plans: [] }} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}
