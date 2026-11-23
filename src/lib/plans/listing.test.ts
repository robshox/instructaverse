import { beforeAll, describe, expect, it } from "vitest";
import { db, migrateDb } from "@/db";
import { purchases, user } from "@/db/schema";
import { createGroup } from "@/lib/access";
import { createPlan, getPlan, listPlans, planBuyerCounts, setPlanListed } from "@/lib/plans";

beforeAll(() => migrateDb());

describe("plan listed toggle (AC-31)", () => {
  it("saves the listed state and the public list follows it", async () => {
    const g = await createGroup("Pro");
    const { id } = await createPlan({ name: "Monthly", description: "", type: "recurring", stripePriceIds: ["price_toggle"], groupIds: [g.id], listed: true });
    await setPlanListed(id, false);
    expect((await getPlan(id))!.listed).toBe(false);
    expect((await listPlans({ listedOnly: true })).map((p) => p.id)).not.toContain(id);
    await setPlanListed(id, true);
    expect((await listPlans({ listedOnly: true })).map((p) => p.id)).toContain(id);
  });
});

describe("plan buyers", () => {
  it("counts distinct buyers per plan", async () => {
    const g = await createGroup("VIP");
    const { id } = await createPlan({ name: "Life", description: "", type: "one_off", stripePriceIds: ["price_buyers"], groupIds: [g.id], listed: true });
    await db.insert(user).values([
      { id: "b1", name: "B1", email: "b1@example.com" },
      { id: "b2", name: "B2", email: "b2@example.com" },
    ]);
    const now = new Date();
    await db.insert(purchases).values([
      { id: "p1", userId: "b1", planId: id, kind: "payment", status: "paid", createdAt: now, updatedAt: now },
      { id: "p2", userId: "b1", planId: id, kind: "payment", status: "refunded", createdAt: now, updatedAt: now },
      { id: "p3", userId: "b2", planId: id, kind: "payment", status: "paid", createdAt: now, updatedAt: now },
    ]);
    const counts = await planBuyerCounts();
    expect(counts.get(id)).toBe(2);
  });
});
