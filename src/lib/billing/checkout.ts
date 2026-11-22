import type Stripe from "stripe";
import type { Plan } from "@/lib/plans";
import { stripe } from "./stripe";

type CheckoutViewer = { id: string; email: string; stripeCustomerId: string | null } | null;

/** Parameters for a Stripe Checkout Session that buys `plan` (FR-2.2). */
export function checkoutSessionParams(
  plan: Pick<Plan, "id" | "type" | "checkoutPriceId">,
  viewer: CheckoutViewer,
  baseUrl: string,
): Stripe.Checkout.SessionCreateParams {
  const metadata = { planId: plan.id };
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: plan.type === "recurring" ? "subscription" : "payment",
    line_items: [{ price: plan.checkoutPriceId, quantity: 1 }],
    metadata,
    success_url: `${baseUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing`,
  };
  if (plan.type === "recurring") params.subscription_data = { metadata };
  else {
    params.payment_intent_data = { metadata };
    // One-off buyers still get a Stripe customer, for the billing portal and refunds.
    params.customer_creation = "always";
  }
  if (viewer) {
    params.client_reference_id = viewer.id;
    if (viewer.stripeCustomerId) params.customer = viewer.stripeCustomerId;
    else params.customer_email = viewer.email;
  }
  return params;
}

export async function createCheckoutSession(plan: Plan, viewer: CheckoutViewer): Promise<string> {
  const session = await stripe.checkout.sessions.create(checkoutSessionParams(plan, viewer, process.env.BASE_URL!));
  if (!session.url) throw new Error("Stripe didn't return a checkout URL");
  return session.url;
}
