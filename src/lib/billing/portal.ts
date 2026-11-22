import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { stripe } from "./stripe";

/**
 * A Stripe Customer Portal session for this member's own customer (AC-14),
 * or null if they've never paid. Card changes and cancellations made there
 * come back to us as webhooks.
 */
export async function billingPortalUrl(userId: string): Promise<string | null> {
  const [member] = await db.select({ customer: user.stripeCustomerId }).from(user).where(eq(user.id, userId));
  if (!member?.customer) return null;
  const session = await stripe.billingPortal.sessions.create({
    customer: member.customer,
    return_url: `${process.env.BASE_URL}/account`,
  });
  return session.url;
}
