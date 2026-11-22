import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/webhooks/stripe/route";
import { db, migrateDb } from "@/db";
import { groupMembership, purchases, user, webhookEvents } from "@/db/schema";
import { canAccess, createGroup, grantMembership } from "@/lib/access";
import { createPlan } from "@/lib/plans";
import { checkoutSession, signedWebhookRequest, stripeEvent } from "@/test/stripe";

const DAY = 86_400_000;
let pro: { id: string };
let vip: { id: string };
let monthly: { id: string };
let lifetime: { id: string };
const member = { id: "m1", role: "member" };

const send = async (event: unknown) => {
  const res = await POST(signedWebhookRequest(event));
  expect(res.status).toBe(200);
};

/** A subscription object as Stripe sends it on customer.subscription.* events. */
function subscription(overrides: Record<string, unknown> = {}, priceId = "price_monthly", periodEnd = Date.now() + 20 * DAY) {
  return {
    id: "sub_1",
    object: "subscription",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    items: { object: "list", data: [{ id: "si_1", price: { id: priceId }, current_period_end: Math.floor(periodEnd / 1000) }] },
    ...overrides,
  };
}

/** An event whose `created` is `offsetSec` relative to now (to test ordering). */
function subEvent(type: string, sub: Record<string, unknown>, offsetSec = 0) {
  return { ...stripeEvent(type, sub), created: Math.floor(Date.now() / 1000) + offsetSec };
}

beforeAll(async () => {
  migrateDb();
  await db.insert(user).values({ id: "admin", name: "Admin", email: "admin@example.com", role: "admin" });
  pro = await createGroup("Pro");
  vip = await createGroup("VIP");
  const base = { description: "", listed: true };
  monthly = await createPlan({ ...base, name: "Monthly", type: "recurring", stripePriceIds: ["price_monthly"], groupIds: [pro.id] });
  await createPlan({ ...base, name: "VIP monthly", type: "recurring", stripePriceIds: ["price_vip"], groupIds: [vip.id] });
  lifetime = await createPlan({ ...base, name: "Lifetime", type: "one_off", stripePriceIds: ["price_life"], groupIds: [pro.id] });
});

beforeEach(async () => {
  await db.delete(groupMembership);
  await db.delete(purchases);
  await db.delete(webhookEvents);
  await db.delete(user).where(eq(user.role, "member"));
  await db.insert(user).values({ id: "m1", name: "Ada", email: "ada@example.com", role: "member" });
});

async function subscribe() {
  await send(
    stripeEvent(
      "checkout.session.completed",
      checkoutSession({ client_reference_id: "m1", customer: "cus_1", subscription: "sub_1", metadata: { planId: monthly.id } }),
    ),
  );
  expect(await canAccess(member, [pro.id])).toBe(true);
}

describe("subscription lifecycle", () => {
  it("AC-8: a canceled subscription loses its groups", async () => {
    await subscribe();
    await send(subEvent("customer.subscription.deleted", subscription({ status: "canceled" }), 1));
    expect(await canAccess(member, [pro.id])).toBe(false);
    expect((await db.select().from(purchases))[0]).toMatchObject({ status: "canceled" });
  });

  it("AC-8: so does a subscription that becomes unpaid", async () => {
    await subscribe();
    await send(subEvent("customer.subscription.updated", subscription({ status: "unpaid" }), 1));
    expect(await canAccess(member, [pro.id])).toBe(false);
  });

  it("AC-9: cancel at period end keeps access until the period ends, then removes it", async () => {
    await subscribe();
    const periodEnd = Date.now() + 10 * DAY;
    await send(subEvent("customer.subscription.updated", subscription({ cancel_at_period_end: true }, "price_monthly", periodEnd), 1));

    expect(await canAccess(member, [pro.id])).toBe(true);
    expect(await canAccess(member, [pro.id], new Date(periodEnd + 1000))).toBe(false); // even if no further webhook arrives
    expect((await db.select().from(purchases))[0]).toMatchObject({ cancelAtPeriodEnd: true });

    await send(subEvent("customer.subscription.deleted", subscription({ status: "canceled" }), 2));
    expect(await canAccess(member, [pro.id])).toBe(false);
  });

  it("un-cancelling before the period ends restores open-ended access", async () => {
    await subscribe();
    const periodEnd = Date.now() + 10 * DAY;
    await send(subEvent("customer.subscription.updated", subscription({ cancel_at_period_end: true }, "price_monthly", periodEnd), 1));
    await send(subEvent("customer.subscription.updated", subscription({ cancel_at_period_end: false }, "price_monthly", periodEnd), 2));
    expect(await canAccess(member, [pro.id], new Date(periodEnd + DAY))).toBe(true);
  });

  it("AC-10: past_due keeps access while Stripe retries", async () => {
    await subscribe();
    await send(subEvent("customer.subscription.updated", subscription({ status: "past_due" }), 1));
    expect(await canAccess(member, [pro.id])).toBe(true);
    expect((await db.select().from(purchases))[0]).toMatchObject({ status: "past_due" });
  });

  it("AC-11: a manual grant to the same group survives the cancellation", async () => {
    await subscribe();
    await grantMembership({ userId: "m1", groupId: pro.id, source: "manual", sourceRef: "admin" });
    await send(subEvent("customer.subscription.deleted", subscription({ status: "canceled" }), 1));
    expect(await canAccess(member, [pro.id])).toBe(true);
  });

  it("ignores events older than the last one applied (out-of-order delivery)", async () => {
    await subscribe();
    await send(subEvent("customer.subscription.deleted", subscription({ status: "canceled" }), 10));
    await send(subEvent("customer.subscription.updated", subscription({ status: "active" }), 5)); // stale
    expect(await canAccess(member, [pro.id])).toBe(false);
  });

  it("switching price to another plan (e.g. in the billing portal) moves the member to that plan's groups", async () => {
    await subscribe();
    await send(subEvent("customer.subscription.updated", subscription({}, "price_vip"), 1));
    expect(await canAccess(member, [pro.id])).toBe(false);
    expect(await canAccess(member, [vip.id])).toBe(true);
  });

  it("ignores subscriptions it doesn't know about", async () => {
    await send(subEvent("customer.subscription.updated", subscription({ id: "sub_other", status: "canceled" })));
    expect(await db.$count(purchases)).toBe(0);
  });
});

describe("refunds", () => {
  async function buyLifetime() {
    await send(
      stripeEvent(
        "checkout.session.completed",
        checkoutSession({
          mode: "payment",
          client_reference_id: "m1",
          subscription: null,
          payment_intent: "pi_1",
          metadata: { planId: lifetime.id },
        }),
      ),
    );
    expect(await canAccess(member, [pro.id])).toBe(true);
  }

  const charge = (overrides: Record<string, unknown>) => ({
    id: "ch_1",
    object: "charge",
    payment_intent: "pi_1",
    amount: 19900,
    amount_refunded: 19900,
    refunded: true,
    ...overrides,
  });

  it("AC-15: a full refund of a one-off purchase removes its groups", async () => {
    await buyLifetime();
    await send(stripeEvent("charge.refunded", charge({})));
    expect(await canAccess(member, [pro.id])).toBe(false);
    expect((await db.select().from(purchases))[0]).toMatchObject({ status: "refunded" });
  });

  it("a partial refund keeps access", async () => {
    await buyLifetime();
    await send(stripeEvent("charge.refunded", charge({ amount_refunded: 5000, refunded: false })));
    expect(await canAccess(member, [pro.id])).toBe(true);
  });
});
