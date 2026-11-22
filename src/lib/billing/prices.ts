import { cacheLife } from "next/cache";
import type Stripe from "stripe";
import { stripe } from "./stripe";

/** "€49 / month", "$300 every 3 months", "£199". */
export function formatPrice(price: Pick<Stripe.Price, "unit_amount" | "currency" | "recurring">): string | null {
  if (price.unit_amount == null) return null;
  const amount = new Intl.NumberFormat("en", {
    style: "currency",
    currency: price.currency.toUpperCase(),
    minimumFractionDigits: price.unit_amount % 100 === 0 ? 0 : 2,
  }).format(price.unit_amount / 100);
  const r = price.recurring;
  if (!r) return amount;
  return r.interval_count === 1 ? `${amount} / ${r.interval}` : `${amount} every ${r.interval_count} ${r.interval}s`;
}

/** Display price for a Stripe price ID, cached for an hour. Null if Stripe can't be reached. */
export async function getPriceLabel(priceId: string): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  try {
    return formatPrice(await stripe.prices.retrieve(priceId));
  } catch (e) {
    console.warn(`[stripe] couldn't load price ${priceId}`, e instanceof Error ? e.message : e);
    return null;
  }
}
