import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { webhookEvents } from "@/db/schema";
import { stripe } from "@/lib/billing/stripe";
import { handleStripeEvent } from "@/lib/billing/webhooks";

/** Stripe webhook endpoint. Verifies the signature (AC-13) and applies each event once (AC-12). */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const [seen] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, event.id));
  if (seen) return Response.json({ received: true, duplicate: true });

  try {
    await handleStripeEvent(event);
  } catch (e) {
    console.error(`[stripe] failed to process ${event.type} ${event.id}`, e);
    // Not recorded, so Stripe retries.
    return new Response("Processing failed", { status: 500 });
  }

  await db.insert(webhookEvents).values({ id: event.id, type: event.type }).onConflictDoNothing();
  return Response.json({ received: true });
}
