import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { planGroups, planPrices, plans, purchases } from "@/db/schema";

export class PlanInputError extends Error {}

/** Thrown when deleting a plan that members have bought. Unlist it instead. */
export class PlanInUseError extends Error {
  constructor() {
    super("Members have bought this plan, so it can't be deleted. Unlist it to hide it from the pricing page.");
    this.name = "PlanInUseError";
  }
}

const planInput = z.object({
  name: z.string().trim().min(1, "Enter a plan name"),
  description: z.string().trim().default(""),
  type: z.enum(["one_off", "recurring"], { error: "Choose one-off or recurring" }),
  stripePriceIds: z
    .array(z.string().trim().regex(/^price_\w+$/, "Stripe price IDs start with price_"))
    .min(1, "Add at least one Stripe price ID"),
  groupIds: z.array(z.string()).min(1, "Choose at least one group for this plan to grant"),
  listed: z.boolean(),
});

export type PlanInput = z.input<typeof planInput>;

export type Plan = {
  id: string;
  name: string;
  description: string;
  type: "one_off" | "recurring";
  listed: boolean;
  stripePriceIds: string[];
  /** The price new checkouts use. */
  checkoutPriceId: string;
  groupIds: string[];
};

function parse(input: PlanInput) {
  const result = planInput.safeParse(input);
  if (!result.success) throw new PlanInputError(result.error.issues[0]?.message ?? "Check the plan details");
  const data = result.data;
  return { ...data, stripePriceIds: [...new Set(data.stripePriceIds)], groupIds: [...new Set(data.groupIds)] };
}

async function assertPricesFree(priceIds: string[], exceptPlanId?: string) {
  const taken = await db
    .select({ id: planPrices.stripePriceId })
    .from(planPrices)
    .where(
      and(inArray(planPrices.stripePriceId, priceIds), exceptPlanId ? ne(planPrices.planId, exceptPlanId) : undefined),
    );
  if (taken.length) throw new PlanInputError(`${taken[0]!.id} is already used by another plan`);
}

function writeLinks(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], planId: string, data: ReturnType<typeof parse>) {
  tx.delete(planPrices).where(eq(planPrices.planId, planId)).run();
  tx.delete(planGroups).where(eq(planGroups.planId, planId)).run();
  tx.insert(planPrices)
    .values(data.stripePriceIds.map((stripePriceId, position) => ({ stripePriceId, planId, position })))
    .run();
  tx.insert(planGroups)
    .values(data.groupIds.map((groupId) => ({ planId, groupId })))
    .run();
}

export async function createPlan(input: PlanInput): Promise<{ id: string }> {
  const data = parse(input);
  await assertPricesFree(data.stripePriceIds);
  const id = crypto.randomUUID();
  db.transaction((tx) => {
    tx.insert(plans)
      .values({ id, name: data.name, description: data.description, type: data.type, listed: data.listed })
      .run();
    writeLinks(tx, id, data);
  });
  return { id };
}

export async function updatePlan(id: string, input: PlanInput): Promise<void> {
  const data = parse(input);
  await assertPricesFree(data.stripePriceIds, id);
  db.transaction((tx) => {
    tx.update(plans)
      .set({ name: data.name, description: data.description, type: data.type, listed: data.listed })
      .where(eq(plans.id, id))
      .run();
    writeLinks(tx, id, data);
  });
}

export async function deletePlan(id: string): Promise<void> {
  if ((await db.$count(purchases, eq(purchases.planId, id))) > 0) throw new PlanInUseError();
  await db.delete(plans).where(eq(plans.id, id));
}

async function hydrate(rows: (typeof plans.$inferSelect)[]): Promise<Plan[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [prices, grants] = await Promise.all([
    db.select().from(planPrices).where(inArray(planPrices.planId, ids)).orderBy(asc(planPrices.position)),
    db.select().from(planGroups).where(inArray(planGroups.planId, ids)),
  ]);
  return rows.map((r) => {
    const stripePriceIds = prices.filter((p) => p.planId === r.id).map((p) => p.stripePriceId);
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      type: r.type,
      listed: r.listed,
      stripePriceIds,
      checkoutPriceId: stripePriceIds[0]!,
      groupIds: grants.filter((g) => g.planId === r.id).map((g) => g.groupId),
    };
  });
}

export async function listPlans({ listedOnly = false } = {}): Promise<Plan[]> {
  const rows = await db
    .select()
    .from(plans)
    .where(listedOnly ? eq(plans.listed, true) : undefined)
    .orderBy(asc(plans.createdAt), asc(plans.name));
  return hydrate(rows);
}

export async function getPlan(id: string): Promise<Plan | null> {
  const rows = await db.select().from(plans).where(eq(plans.id, id));
  return (await hydrate(rows))[0] ?? null;
}

/** Which plan a Stripe price belongs to (checkout webhooks, migration). */
export async function planForPrice(stripePriceId: string): Promise<Plan | null> {
  const [link] = await db.select().from(planPrices).where(eq(planPrices.stripePriceId, stripePriceId));
  return link ? getPlan(link.planId) : null;
}
