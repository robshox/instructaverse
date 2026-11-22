import Stripe from "stripe";
import { lazy } from "@/lib/lazy";

/** Stripe client, created on first use (the key isn't available at build time). */
export const stripe: Stripe = lazy(() => new Stripe(process.env.STRIPE_SECRET_KEY!));

/** Stripe objects reference related objects either by ID or expanded. */
export function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}
