import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { createCheckoutSession } from "@/lib/billing/checkout";
import { getPlan } from "@/lib/plans";
import { getViewer } from "@/lib/session";

/** POST from the pricing page: send the visitor to Stripe Checkout for a listed plan. */
export async function POST(request: Request) {
  const form = await request.formData();
  const plan = await getPlan(String(form.get("plan") ?? ""));
  const pricing = new URL("/pricing", process.env.BASE_URL);
  if (!plan || !plan.listed) return Response.redirect(pricing, 303);

  const viewer = await getViewer();
  const account = viewer ? (await db.select().from(user).where(eq(user.id, viewer.id)))[0] : undefined;
  const url = await createCheckoutSession(
    plan,
    account ? { id: account.id, email: account.email, stripeCustomerId: account.stripeCustomerId } : null,
  );
  return Response.redirect(url, 303);
}
