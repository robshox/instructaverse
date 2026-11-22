import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, migrateDb } from "@/db";
import { groupMembership, groups, user } from "@/db/schema";
import {
  activeGroupIds,
  canAccess,
  createGroup,
  deleteGroup,
  grantMembership,
  listGroups,
  renameGroup,
  revokeBySource,
} from "@/lib/access";

const HOUR = 3_600_000;
let n = 0;

async function makeUser(role: "admin" | "member" = "member") {
  const id = `u${++n}`;
  await db.insert(user).values({ id, name: id, email: `${id}@example.com`, role });
  return { id, role };
}

beforeAll(() => migrateDb());
beforeEach(async () => {
  await db.delete(groupMembership);
  await db.delete(groups);
});

describe("groups", () => {
  it("can be created, renamed and listed with member counts", async () => {
    const g = await createGroup("Founders");
    await renameGroup(g.id, "Founding members");
    const member = await makeUser();
    await grantMembership({ userId: member.id, groupId: g.id, source: "manual", sourceRef: "admin" });
    expect(await listGroups()).toEqual([expect.objectContaining({ id: g.id, name: "Founding members", memberCount: 1 })]);
  });

  it("rejects duplicate and blank names", async () => {
    await createGroup("Pro");
    await expect(createGroup("Pro")).rejects.toThrow(/already exists/);
    await expect(createGroup("  ")).rejects.toThrow(/name/i);
  });

  it("deleting a group removes its memberships", async () => {
    const g = await createGroup("Temp");
    const member = await makeUser();
    await grantMembership({ userId: member.id, groupId: g.id, source: "manual", sourceRef: "admin" });
    await deleteGroup(g.id);
    expect(await activeGroupIds(member.id)).toEqual([]);
  });
});

describe("memberships", () => {
  it("granting the same source twice is idempotent", async () => {
    const g = await createGroup("Pro");
    const member = await makeUser();
    const grant = { userId: member.id, groupId: g.id, source: "plan" as const, sourceRef: "sub_1" };
    await grantMembership(grant);
    await grantMembership(grant);
    expect(await db.$count(groupMembership)).toBe(1);
  });

  it("AC-11: revoking a plan's access leaves a manual grant for the same group in place", async () => {
    const g = await createGroup("Pro");
    const member = await makeUser();
    await grantMembership({ userId: member.id, groupId: g.id, source: "plan", sourceRef: "sub_1" });
    await grantMembership({ userId: member.id, groupId: g.id, source: "manual", sourceRef: "admin" });

    await revokeBySource("plan", "sub_1");
    expect(await activeGroupIds(member.id)).toEqual([g.id]);

    await revokeBySource("manual", "admin", { userId: member.id, groupId: g.id });
    expect(await activeGroupIds(member.id)).toEqual([]);
  });

  it("FR-2.6: keeps access while any source remains (two plans for one group)", async () => {
    const g = await createGroup("Pro");
    const member = await makeUser();
    await grantMembership({ userId: member.id, groupId: g.id, source: "plan", sourceRef: "sub_1" });
    await grantMembership({ userId: member.id, groupId: g.id, source: "plan", sourceRef: "pi_2" });
    await revokeBySource("plan", "sub_1");
    expect(await activeGroupIds(member.id)).toEqual([g.id]);
  });

  it("revoking one source only touches that source's rows", async () => {
    const g = await createGroup("Pro");
    const a = await makeUser();
    const b = await makeUser();
    await grantMembership({ userId: a.id, groupId: g.id, source: "plan", sourceRef: "sub_a" });
    await grantMembership({ userId: b.id, groupId: g.id, source: "plan", sourceRef: "sub_b" });
    await revokeBySource("plan", "sub_a");
    expect(await activeGroupIds(a.id)).toEqual([]);
    expect(await activeGroupIds(b.id)).toEqual([g.id]);
  });

  it("ignores memberships past their expiry", async () => {
    const g = await createGroup("Pro");
    const member = await makeUser();
    const now = Date.now();
    await grantMembership({
      userId: member.id,
      groupId: g.id,
      source: "plan",
      sourceRef: "sub_1",
      expiresAt: new Date(now + HOUR),
    });
    expect(await activeGroupIds(member.id, new Date(now))).toEqual([g.id]);
    expect(await activeGroupIds(member.id, new Date(now + 2 * HOUR))).toEqual([]);
  });

  it("re-granting a source updates its expiry (e.g. a renewed period)", async () => {
    const g = await createGroup("Pro");
    const member = await makeUser();
    const now = Date.now();
    const grant = { userId: member.id, groupId: g.id, source: "plan" as const, sourceRef: "sub_1" };
    await grantMembership({ ...grant, expiresAt: new Date(now + HOUR) });
    await grantMembership({ ...grant, expiresAt: new Date(now + 3 * HOUR) });
    expect(await activeGroupIds(member.id, new Date(now + 2 * HOUR))).toEqual([g.id]);
  });
});

describe("canAccess", () => {
  it("lets members in when they're in any of the item's groups", async () => {
    const pro = await createGroup("Pro");
    const vip = await createGroup("VIP");
    const member = await makeUser();
    await grantMembership({ userId: member.id, groupId: vip.id, source: "manual", sourceRef: "admin" });
    expect(await canAccess(member, [pro.id, vip.id])).toBe(true);
    expect(await canAccess(member, [pro.id])).toBe(false);
  });

  it("AC-17: an item with no access groups is visible to admins only", async () => {
    const admin = await makeUser("admin");
    const member = await makeUser();
    expect(await canAccess(admin, [])).toBe(true);
    expect(await canAccess(member, [])).toBe(false);
  });

  it("admins can access everything", async () => {
    const g = await createGroup("Pro");
    expect(await canAccess(await makeUser("admin"), [g.id])).toBe(true);
  });

  it("nobody signed in gets nothing", async () => {
    const g = await createGroup("Pro");
    expect(await canAccess(null, [g.id])).toBe(false);
  });
});
