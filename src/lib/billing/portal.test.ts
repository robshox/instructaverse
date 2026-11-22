import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhooks/stripe/route";
import { db, migrateDb } from "@/db";
import { user } from "@/db/schema";
import { createGroup } from "@/lib/access";
import { checkoutReady } from "@/lib/billing/checkout";
import { billingPortalUrl } from "@/lib/billing/portal";
import { stripe } from "@/lib/billing/stripe";
import { createPlan } from "@/lib/plans";
import { checkoutSession, signedWebhookRequest, stripeEvent } from "@/test/stripe";

beforeAll(async () => {
  migrateDb();
  await db.insert(user).values([
    { id: "admin", name: "Admin", email: "admin@example.com", role: "admin" },
    { id: "paid", name: "Paid", email: "paid@example.com", role: "member", stripeCustomerId: "cus_paid" },
    { id: "free", name: "Free", email: "free@example.com", role: "member" },
  ]);
});

afterEach(() => vi.restoreAllMocks());

describe("billing portal (AC-14)", () => {
  it("opens a portal session for the member's own Stripe customer, returning to /account", async () => {
    const create = vi
      .spyOn(stripe.billingPortal.sessions, "create")
      .mockResolvedValue({ url: "https://billing.stripe.com/p/session_123" } as never);
    expect(await billingPortalUrl("paid")).toBe("https://billing.stripe.com/p/session_123");
    expect(create).toHaveBeenCalledWith({ customer: "cus_paid", return_url: "http://localhost:3000/account" });
  });

  it("returns null for members who have never paid", async () => {
    const create = vi.spyOn(stripe.billingPortal.sessions, "create");
    expect(await billingPortalUrl("free")).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });
});

describe("post-checkout status", () => {
  it("is not ready until the checkout webhook has been processed", async () => {
    const group = await createGroup("Pro");
    const plan = await createPlan({
      name: "Monthly",
      description: "",
      type: "recurring",
      stripePriceIds: ["price_m"],
      groupIds: [group.id],
      listed: true,
    });
    expect(await checkoutReady("cs_test_pending")).toBe(false);
    await POST(signedWebhookRequest(stripeEvent("checkout.session.completed", checkoutSession({ id: "cs_test_pending", metadata: { planId: plan.id } }))));
    expect(await checkoutReady("cs_test_pending")).toBe(true);
  });
});
