import { describe, expect, it } from "vitest";
import { checkoutSessionParams } from "@/lib/billing/checkout";

const plan = { id: "plan_1", type: "recurring" as const, checkoutPriceId: "price_monthly" };

describe("checkoutSessionParams", () => {
  it("subscription mode for recurring plans, tagged with the plan", () => {
    const params = checkoutSessionParams(plan, null, "https://c.example.com");
    expect(params).toMatchObject({
      mode: "subscription",
      line_items: [{ price: "price_monthly", quantity: 1 }],
      metadata: { planId: "plan_1" },
      subscription_data: { metadata: { planId: "plan_1" } },
      success_url: "https://c.example.com/pricing/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://c.example.com/pricing",
    });
    expect(params.client_reference_id).toBeUndefined();
  });

  it("payment mode for one-off plans, always creating a Stripe customer", () => {
    const params = checkoutSessionParams({ ...plan, type: "one_off" }, null, "https://c.example.com");
    expect(params).toMatchObject({
      mode: "payment",
      customer_creation: "always",
      payment_intent_data: { metadata: { planId: "plan_1" } },
    });
  });

  it("signed-in members are linked and reuse their Stripe customer", () => {
    const viewer = { id: "u1", email: "ada@example.com", stripeCustomerId: "cus_9" };
    expect(checkoutSessionParams(plan, viewer, "https://c.example.com")).toMatchObject({
      client_reference_id: "u1",
      customer: "cus_9",
    });
    const fresh = checkoutSessionParams(plan, { ...viewer, stripeCustomerId: null }, "https://c.example.com");
    expect(fresh).toMatchObject({ client_reference_id: "u1", customer_email: "ada@example.com" });
  });
});
