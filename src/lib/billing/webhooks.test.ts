import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/webhooks/stripe/route";
import { db, migrateDb } from "@/db";
import { groupMembership, purchases, user, webhookEvents } from "@/db/schema";
import { activeGroupIds, canAccess, createGroup } from "@/lib/access";
import { createPlan, deletePlan, PlanInUseError } from "@/lib/plans";
import { checkoutSession, signedWebhookRequest, stripeEvent } from "@/test/stripe";

let group: { id: string };
let recurring: { id: string };
let oneOff: { id: string };

beforeAll(async () => {
  migrateDb();
  // An admin exists already (setup is done) so new accounts are plain members.
  await db.insert(user).values({ id: "admin", name: "Admin", email: "admin@example.com", role: "admin" });
  group = await createGroup("Pro");
  const base = { description: "", groupIds: [group.id], listed: true };
  recurring = await createPlan({ ...base, name: "Monthly", type: "recurring", stripePriceIds: ["price_monthly"] });
  oneOff = await createPlan({ ...base, name: "Lifetime", type: "one_off", stripePriceIds: ["price_lifetime"] });
});

beforeEach(async () => {
  await db.delete(groupMembership);
  await db.delete(purchases);
  await db.delete(webhookEvents);
  await db.delete(user).where(eq(user.role, "member"));
});

const completed = (session: Record<string, unknown>) => stripeEvent("checkout.session.completed", checkoutSession(session));
const memberByEmail = async (email: string) => (await db.select().from(user).where(eq(user.email, email)))[0];

describe("Stripe webhook: checkout completed", () => {
  it("AC-6: recurring checkout creates the account and grants the plan's groups", async () => {
    const res = await POST(signedWebhookRequest(completed({ metadata: { planId: recurring.id }, subscription: "sub_A" })));
    expect(res.status).toBe(200);

    const member = await memberByEmail("new.member@example.com");
    expect(member).toMatchObject({ role: "member", name: "New Member", stripeCustomerId: expect.stringMatching(/^cus_/) });
    expect(await activeGroupIds(member!.id)).toEqual([group.id]);
    expect(await canAccess(member, [group.id])).toBe(true);

    const [membership] = await db.select().from(groupMembership).where(eq(groupMembership.userId, member!.id));
    expect(membership).toMatchObject({ source: "plan", sourceRef: "sub_A", expiresAt: null });
    const [purchase] = await db.select().from(purchases);
    expect(purchase).toMatchObject({ userId: member!.id, planId: recurring.id, kind: "subscription", stripeSubscriptionId: "sub_A" });
  });

  it("AC-7: one-off checkout grants the groups with no expiry", async () => {
    await POST(
      signedWebhookRequest(
        completed({ mode: "payment", subscription: null, payment_intent: "pi_L", metadata: { planId: oneOff.id } }),
      ),
    );
    const member = await memberByEmail("new.member@example.com");
    const [membership] = await db.select().from(groupMembership).where(eq(groupMembership.userId, member!.id));
    expect(membership).toMatchObject({ source: "plan", sourceRef: "pi_L", expiresAt: null });
    expect((await db.select().from(purchases))[0]).toMatchObject({ kind: "payment", stripePaymentIntentId: "pi_L" });
  });

  it("links the purchase to an existing account with the same email (any case)", async () => {
    await db.insert(user).values({ id: "m1", name: "Ada", email: "ada@example.com", role: "member" });
    await POST(
      signedWebhookRequest(
        completed({ metadata: { planId: recurring.id }, customer_details: { email: "Ada@Example.com", name: "Ada L" } }),
      ),
    );
    expect(await db.$count(user, eq(user.role, "member"))).toBe(1);
    expect(await activeGroupIds("m1")).toEqual([group.id]);
  });

  it("prefers the signed-in member who started checkout (client_reference_id)", async () => {
    await db.insert(user).values({ id: "m2", name: "Bo", email: "bo@example.com", role: "member" });
    await POST(
      signedWebhookRequest(
        completed({ metadata: { planId: recurring.id }, client_reference_id: "m2", customer_details: { email: "billing@bo.co" } }),
      ),
    );
    expect(await activeGroupIds("m2")).toEqual([group.id]);
    expect(await memberByEmail("billing@bo.co")).toBeUndefined();
  });

  it("AC-12: the same event delivered twice is applied once", async () => {
    const event = completed({ metadata: { planId: recurring.id } });
    expect((await POST(signedWebhookRequest(event))).status).toBe(200);
    expect((await POST(signedWebhookRequest(event))).status).toBe(200);
    expect(await db.$count(purchases)).toBe(1);
    expect(await db.$count(user, eq(user.role, "member"))).toBe(1);
    expect(await db.$count(webhookEvents)).toBe(1);
  });

  it("AC-13: rejects a bad signature with 400 and changes nothing", async () => {
    const res = await POST(signedWebhookRequest(completed({ metadata: { planId: recurring.id } }), "whsec_wrong"));
    expect(res.status).toBe(400);
    expect(await db.$count(user, eq(user.role, "member"))).toBe(0);
    expect(await db.$count(webhookEvents)).toBe(0);
  });

  it("rejects a request with no signature", async () => {
    const res = await POST(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
  });

  it("doesn't grant anything for an unpaid one-off session (e.g. a delayed bank payment)", async () => {
    await POST(
      signedWebhookRequest(
        completed({ mode: "payment", subscription: null, payment_intent: "pi_U", payment_status: "unpaid", metadata: { planId: oneOff.id } }),
      ),
    );
    expect(await db.$count(groupMembership)).toBe(0);
  });

  it("acknowledges sessions for unknown plans without granting anything", async () => {
    const res = await POST(signedWebhookRequest(completed({ metadata: { planId: "nope" } })));
    expect(res.status).toBe(200);
    expect(await db.$count(groupMembership)).toBe(0);
  });

  it("ignores event types it doesn't handle", async () => {
    const res = await POST(signedWebhookRequest(stripeEvent("customer.created", { id: "cus_x", object: "customer" })));
    expect(res.status).toBe(200);
  });
});

describe("plans with purchases (carried over from 2.2)", () => {
  it("can't be deleted while purchases reference them", async () => {
    await POST(signedWebhookRequest(completed({ metadata: { planId: recurring.id } })));
    await expect(deletePlan(recurring.id)).rejects.toBeInstanceOf(PlanInUseError);
  });
});
