import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, migrateDb } from "@/db";
import { groups, planGroups, planPrices, plans } from "@/db/schema";
import { createGroup, deleteGroup } from "@/lib/access";
import { createPlan, deletePlan, getPlan, listPlans, planForPrice, PlanInputError, updatePlan } from "@/lib/plans";

let pro: { id: string };
let vip: { id: string };

beforeAll(() => migrateDb());
beforeEach(async () => {
  await db.delete(planPrices);
  await db.delete(planGroups);
  await db.delete(plans);
  await db.delete(groups);
  pro = await createGroup("Pro");
  vip = await createGroup("VIP");
});

const monthly = () => ({
  name: "Monthly",
  description: "Everything, billed monthly",
  type: "recurring" as const,
  stripePriceIds: ["price_monthly"],
  groupIds: [pro.id],
  listed: true,
});

describe("plans", () => {
  it("creates a plan with its prices and groups", async () => {
    const plan = await createPlan(monthly());
    expect(await getPlan(plan.id)).toMatchObject({
      name: "Monthly",
      type: "recurring",
      listed: true,
      stripePriceIds: ["price_monthly"],
      checkoutPriceId: "price_monthly",
      groupIds: [pro.id],
    });
  });

  it("only listed plans are public (pricing page)", async () => {
    await createPlan(monthly());
    await createPlan({ ...monthly(), name: "Legacy", stripePriceIds: ["price_old"], listed: false });
    expect((await listPlans({ listedOnly: true })).map((p) => p.name)).toEqual(["Monthly"]);
    expect((await listPlans()).map((p) => p.name).sort()).toEqual(["Legacy", "Monthly"]);
  });

  it("the first price is used for new checkouts; extra prices map existing subscribers (migration)", async () => {
    const plan = await createPlan({ ...monthly(), stripePriceIds: ["price_new", "price_circle_2024"] });
    expect((await getPlan(plan.id))?.checkoutPriceId).toBe("price_new");
    expect((await planForPrice("price_circle_2024"))?.id).toBe(plan.id);
    expect(await planForPrice("price_unknown")).toBeNull();
  });

  it("a Stripe price can belong to only one plan", async () => {
    await createPlan(monthly());
    await expect(createPlan({ ...monthly(), name: "Other" })).rejects.toThrow(/price_monthly.*already/);
  });

  it("validates input", async () => {
    await expect(createPlan({ ...monthly(), name: " " })).rejects.toBeInstanceOf(PlanInputError);
    await expect(createPlan({ ...monthly(), stripePriceIds: [] })).rejects.toThrow(/price/i);
    await expect(createPlan({ ...monthly(), stripePriceIds: ["prod_123"] })).rejects.toThrow(/price_/);
    await expect(createPlan({ ...monthly(), groupIds: [] })).rejects.toThrow(/group/i);
  });

  it("updates replace prices and groups", async () => {
    const plan = await createPlan(monthly());
    await updatePlan(plan.id, { ...monthly(), stripePriceIds: ["price_v2"], groupIds: [pro.id, vip.id], listed: false });
    expect(await getPlan(plan.id)).toMatchObject({
      stripePriceIds: ["price_v2"],
      groupIds: expect.arrayContaining([pro.id, vip.id]),
      listed: false,
    });
    expect(await planForPrice("price_monthly")).toBeNull();
  });

  it("deleting a group removes it from plans", async () => {
    const plan = await createPlan({ ...monthly(), groupIds: [pro.id, vip.id] });
    await deleteGroup(vip.id);
    expect((await getPlan(plan.id))?.groupIds).toEqual([pro.id]);
  });

  it("deletes a plan", async () => {
    const plan = await createPlan(monthly());
    await deletePlan(plan.id);
    expect(await getPlan(plan.id)).toBeNull();
    expect(await planForPrice("price_monthly")).toBeNull();
  });
});
