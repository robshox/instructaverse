import Stripe from "stripe";

let seq = 0;
const stripe = new Stripe("sk_test_dummy");

/** A Stripe event as it would arrive at the webhook endpoint. */
export function stripeEvent(type: string, object: Record<string, unknown>, id = `evt_${++seq}_${Date.now()}`) {
  return { id, object: "event", type, created: Math.floor(Date.now() / 1000), data: { object }, livemode: false };
}

/** Build a webhook request signed with the test secret (or a wrong one). */
export function signedWebhookRequest(event: unknown, secret = process.env.STRIPE_WEBHOOK_SECRET!) {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body: payload,
  });
}

export function checkoutSession(overrides: Record<string, unknown>) {
  return {
    id: `cs_test_${++seq}`,
    object: "checkout.session",
    mode: "subscription",
    payment_status: "paid",
    status: "complete",
    customer: `cus_${seq}`,
    customer_details: { email: "new.member@example.com", name: "New Member" },
    client_reference_id: null,
    subscription: `sub_${seq}`,
    payment_intent: null,
    metadata: {},
    ...overrides,
  };
}
