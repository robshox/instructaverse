"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { checkoutAccountEmail } from "@/lib/billing/checkout";

export type LinkState = { sent?: boolean; error?: string };

/** Email a sign-in link to the account created by this checkout (the address is never shown). */
export async function emailSignInLink(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const email = await checkoutAccountEmail(String(formData.get("sessionId") ?? ""));
  if (!email) return { error: "We couldn't find that purchase yet. Try again in a moment." };
  await auth.api.signInMagicLink({
    body: { email, callbackURL: "/", errorCallbackURL: "/login" },
    headers: await headers(),
  });
  return { sent: true };
}
