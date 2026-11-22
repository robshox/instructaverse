import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { purchases, user } from "@/db/schema";
import { grantMembership, revokeBySource } from "@/lib/access";
import { getPlan, planForPrice, type Plan } from "@/lib/plans";
import { idOf } from "./stripe";

/** Apply one verified Stripe event. Every handler is safe to run twice. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutCompleted(event.data.object);
      break;
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await onSubscriptionChanged(event.data.object, new Date(event.created * 1000));
      break;
    case "charge.refunded":
      await onChargeRefunded(event.data.object);
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

  await grantPlan(member.id, plan, sourceRef, null);
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

/** Statuses that end access (AC-8). `past_due` keeps it while Stripe retries (AC-10). */
const ENDED = new Set(["canceled", "unpaid", "incomplete_expired"]);

async function grantPlan(userId: string, plan: Plan, sourceRef: string, expiresAt: Date | null) {
  for (const groupId of plan.groupIds) {
    await grantMembership({ userId, groupId, source: "plan", sourceRef, expiresAt });
  }
}

async function onSubscriptionChanged(sub: Stripe.Subscription, eventAt: Date) {
  const [purchase] = await db.select().from(purchases).where(eq(purchases.stripeSubscriptionId, sub.id));
  if (!purchase) return; // Not one of ours (or checkout hasn't been processed yet; it grants the current state).
  if (purchase.lastEventAt && eventAt < purchase.lastEventAt) return; // stale, delivered out of order

  const item = sub.items.data[0];
  const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : null;
  // A price change (e.g. switching plan in the billing portal) moves the purchase to that plan.
  const priceId = item?.price?.id;
  const newPlan = priceId ? await planForPrice(priceId) : null;
  const plan = newPlan ?? (await getPlan(purchase.planId));

  await db
    .update(purchases)
    .set({
      planId: plan?.id ?? purchase.planId,
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodEnd: periodEnd,
      lastEventAt: eventAt,
      updatedAt: new Date(),
    })
    .where(eq(purchases.id, purchase.id));

  // Start from a clean slate for this subscription, then grant what its current state allows.
  await revokeBySource("plan", sub.id);
  if (ENDED.has(sub.status) || !plan) return;
  // AC-9: a pending cancellation keeps access until the period ends, and the
  // expiry makes sure it stops then even if the final webhook never arrives.
  await grantPlan(purchase.userId, plan, sub.id, sub.cancel_at_period_end ? periodEnd : null);
}

/** AC-15: a full refund of a one-off purchase removes the groups it granted. */
async function onChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = idOf(charge.payment_intent);
  if (!paymentIntentId || !charge.refunded) return; // partial refunds keep access
  const [purchase] = await db.select().from(purchases).where(eq(purchases.stripePaymentIntentId, paymentIntentId));
  if (!purchase) return;
  await db.update(purchases).set({ status: "refunded", updatedAt: new Date() }).where(eq(purchases.id, purchase.id));
  await revokeBySource("plan", paymentIntentId);
}
