import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boardGroups, courseGroups, eventGroups, groups, planGroups, plans } from "@/db/schema";

export type GroupUsage = { courses: number; boards: number; events: number; plans: string[] };

/** AC-32: what each group gates (courses, boards, events) and which plans grant it. */
export async function groupUsage(): Promise<Map<string, GroupUsage>> {
  const [all, c, b, e, p] = await Promise.all([
    db.select({ id: groups.id }).from(groups),
    db.select({ groupId: courseGroups.groupId }).from(courseGroups),
    db.select({ groupId: boardGroups.groupId }).from(boardGroups),
    db.select({ groupId: eventGroups.groupId }).from(eventGroups),
    db.select({ groupId: planGroups.groupId, name: plans.name }).from(planGroups).innerJoin(plans, eq(plans.id, planGroups.planId)),
  ]);
  const usage = new Map<string, GroupUsage>(all.map((g) => [g.id, { courses: 0, boards: 0, events: 0, plans: [] }]));
  for (const r of c) if (usage.has(r.groupId)) usage.get(r.groupId)!.courses += 1;
  for (const r of b) if (usage.has(r.groupId)) usage.get(r.groupId)!.boards += 1;
  for (const r of e) if (usage.has(r.groupId)) usage.get(r.groupId)!.events += 1;
  for (const r of p) usage.get(r.groupId)?.plans.push(r.name);
  for (const u of usage.values()) u.plans.sort((x, y) => x.localeCompare(y));
  return usage;
}
