"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";

export type FormState = { error?: string; success?: string };

export async function requestReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.email("Enter a valid email address").safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    await auth.api.requestPasswordReset({ body: { email: parsed.data, redirectTo: "/reset" }, headers: await headers() });
  } catch {
    return { error: "Couldn't send the email. Please try again." };
  }
  return { success: "If that email has an account, a reset link is on its way." };
}

export async function setNewPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ token: z.string().min(1), newPassword: z.string().min(8, "Use at least 8 characters") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    await auth.api.resetPassword({ body: parsed.data, headers: await headers() });
  } catch {
    return { error: "That reset link has expired or was already used. Request a new one." };
  }
  redirect("/login?reset=1");
}
