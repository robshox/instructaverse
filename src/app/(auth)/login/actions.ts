"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";

/** `email` is echoed back so the form keeps it after React resets the fields. */
export type FormState = { error?: string; success?: string; email?: string };

const email = z.email("Enter a valid email address");

export async function sendMagicLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email: String(formData.get("email") ?? "") };
  try {
    await auth.api.signInMagicLink({
      body: { email: parsed.data, callbackURL: "/", errorCallbackURL: "/login" },
      headers: await headers(),
    });
  } catch {
    return { error: "Couldn't send the link. Please try again." };
  }
  // Same message whether or not the address has an account.
  return { success: "If that email has an account, a sign-in link is on its way. It expires in 15 minutes." };
}

export async function signInWithPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password") }).safeParse(
    Object.fromEntries(formData),
  );
  const typedEmail = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email: typedEmail };
  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (e) {
    const fail = (error: string) => ({ error, email: typedEmail });
    if (e instanceof APIError && e.statusCode === 429) return fail(e.message);
    if (e instanceof APIError && e.statusCode === 401) return fail("Wrong email or password.");
    return fail("Couldn't sign you in. Please try again.");
  }
  redirect("/");
}
