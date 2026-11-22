import { and, asc, count, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { groupMembership, groups } from "@/db/schema";

export type MembershipSource = "plan" | "manual";
export type Viewer = { id: string; role: string } | null | undefined;

export class GroupNameError extends Error {}

function cleanName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new GroupNameError("Enter a group name");
  return trimmed;
}

async function assertNameFree(name: string, exceptId?: string) {
  const [existing] = await db.select({ id: groups.id }).from(groups).where(eq(groups.name, name));
  if (existing && existing.id !== exceptId) throw new GroupNameError(`A group called "${name}" already exists`);
}

export async function createGroup(name: string) {
  const clean = cleanName(name);
  await assertNameFree(clean);
  const [row] = await db.insert(groups).values({ id: crypto.randomUUID(), name: clean }).returning();
  return row!;
}

export async function renameGroup(id: string, name: string) {
  const clean = cleanName(name);
  await assertNameFree(clean, id);
  await db.update(groups).set({ name: clean }).where(eq(groups.id, id));
}

/** Removes the group, its memberships and (via foreign keys) its use on gated items. */
export async function deleteGroup(id: string) {
  await db.delete(groups).where(eq(groups.id, id));
}

export async function listGroups() {
  return db
    .select({ id: groups.id, name: groups.name, memberCount: count(groupMembership.userId) })
    .from(groups)
    .leftJoin(groupMembership, eq(groupMembership.groupId, groups.id))
    .groupBy(groups.id)
    .orderBy(asc(groups.name));
}

export async function grantMembership(input: {
  userId: string;
  groupId: string;
  source: MembershipSource;
  sourceRef: string;
  expiresAt?: Date | null;
}) {
  const expiresAt = input.expiresAt ?? null;
  await db
    .insert(groupMembership)
    .values({ id: crypto.randomUUID(), ...input, expiresAt })
    .onConflictDoUpdate({
      target: [groupMembership.userId, groupMembership.groupId, groupMembership.source, groupMembership.sourceRef],
      set: { expiresAt },
    });
}

/**
 * Remove every membership granted by one source (e.g. a cancelled
 * subscription). Memberships from other sources are untouched (FR-2.5).
 */
export async function revokeBySource(
  source: MembershipSource,
  sourceRef: string,
  scope: { userId?: string; groupId?: string } = {},
) {
  await db
    .delete(groupMembership)
    .where(
      and(
        eq(groupMembership.source, source),
        eq(groupMembership.sourceRef, sourceRef),
        scope.userId ? eq(groupMembership.userId, scope.userId) : undefined,
        scope.groupId ? eq(groupMembership.groupId, scope.groupId) : undefined,
      ),
    );
}

/** Groups the member currently belongs to through at least one unexpired source. */
export async function activeGroupIds(userId: string, now = new Date()): Promise<string[]> {
  const rows = await db
    .selectDistinct({ groupId: groupMembership.groupId })
    .from(groupMembership)
    .where(
      and(
        eq(groupMembership.userId, userId),
        or(isNull(groupMembership.expiresAt), gt(groupMembership.expiresAt, now)),
      ),
    );
  return rows.map((r) => r.groupId);
}

/**
 * Can this viewer see an item gated to `itemGroupIds`? Admins see everything;
 * an item with no groups is admins-only (AC-17); members need any one group.
 */
export async function canAccess(viewer: Viewer, itemGroupIds: string[], now = new Date()): Promise<boolean> {
  if (!viewer) return false;
  if (viewer.role === "admin") return true;
  if (itemGroupIds.length === 0) return false;
  const [hit] = await db
    .select({ id: groupMembership.id })
    .from(groupMembership)
    .where(
      and(
        eq(groupMembership.userId, viewer.id),
        inArray(groupMembership.groupId, itemGroupIds),
        or(isNull(groupMembership.expiresAt), gt(groupMembership.expiresAt, now)),
      ),
    )
    .limit(1);
  return Boolean(hit);
}
