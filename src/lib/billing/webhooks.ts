import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { purchases, user } from "@/db/schema";
import { grantMembership } from "@/lib/access";
import { getPlan } from "@/lib/plans";
import { idOf } from "./stripe";

/** Apply one verified Stripe event. Every handler is safe to run twice. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutCompleted(event.data.object);
      break;
    default:
      // Not an event we act on.
      break;
  }
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  const plan = session.metadata?.planId ? await getPlan(session.metadata.planId) : null;
  if (!plan) {
    console.warn(`[stripe] checkout ${session.id}: no known plan in metadata; ignoring`);
    return;
  }
  // Delayed payment methods complete checkout before the money arrives.
  if (session.mode === "payment" && session.payment_status !== "paid") return;

  const customerId = idOf(session.customer);
  const member = await findOrCreateMember(session, customerId);
  if (!member) {
    console.warn(`[stripe] checkout ${session.id}: no email on the session; can't create an account`);
    return;
  }

  const subscriptionId = idOf(session.subscription);
  const paymentIntentId = idOf(session.payment_intent);
  const sourceRef = subscriptionId ?? paymentIntentId ?? session.id;

  await db
    .insert(purchases)
    .values({
      id: crypto.randomUUID(),
      userId: member.id,
      planId: plan.id,
      kind: subscriptionId ? "subscription" : "payment",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePaymentIntentId: subscriptionId ? null : paymentIntentId,
      stripeCheckoutSessionId: session.id,
      status: subscriptionId ? "active" : "paid",
    })
    .onConflictDoNothing();

  for (const groupId of plan.groupIds) {
    await grantMembership({ userId: member.id, groupId, source: "plan", sourceRef });
  }
}

/**
 * Who bought this? In order: the signed-in member who started checkout, the
 * member already linked to this Stripe customer, a member with the same email.
 * Otherwise create an account; they claim it by magic link with that email.
 */
async function findOrCreateMember(session: Stripe.Checkout.Session, customerId: string | null) {
  const byId = async (id: string) => (await db.select().from(user).where(eq(user.id, id)))[0];
  let member = session.client_reference_id ? await byId(session.client_reference_id) : undefined;
  if (!member && customerId) member = (await db.select().from(user).where(eq(user.stripeCustomerId, customerId)))[0];

  const email = session.customer_details?.email?.trim().toLowerCase();
  if (!member && email) member = (await db.select().from(user).where(sql`lower(${user.email}) = ${email}`))[0];

  if (!member) {
    if (!email) return null;
    const name = session.customer_details?.name?.trim() || email.split("@")[0]!;
    [member] = await db
      .insert(user)
      .values({ id: crypto.randomUUID(), name, email, role: "member", stripeCustomerId: customerId })
      .onConflictDoNothing()
      .returning();
    // Lost a race with a concurrent delivery: use the row it created.
    member ??= (await db.select().from(user).where(eq(user.email, email)))[0];
  }

  if (member && customerId && !member.stripeCustomerId) {
    await db.update(user).set({ stripeCustomerId: customerId }).where(eq(user.id, member.id));
    member = { ...member, stripeCustomerId: customerId };
  }
  return member ?? null;
}
