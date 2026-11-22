"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getViewer } from "@/lib/session";

export type PasswordState = { error?: string; success?: string; ok?: number };

const newPassword = z.string().min(8, "Use at least 8 characters");

/** FR-1.2: set a password (magic-link-only members) or change it. */
export async function savePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  if (!(await getViewer())) return { error: "Please sign in again." };
  const parsed = newPassword.safeParse(formData.get("newPassword"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const current = formData.get("currentPassword");
  const requestHeaders = await headers();
  try {
    if (typeof current === "string") {
      await auth.api.changePassword({
        body: { currentPassword: current, newPassword: parsed.data, revokeOtherSessions: true },
        headers: requestHeaders,
      });
    } else {
      await auth.api.setPassword({ body: { newPassword: parsed.data }, headers: requestHeaders });
    }
  } catch (e) {
    if (e instanceof APIError && e.statusCode === 400) return { error: "Your current password is wrong." };
    return { error: "Couldn't save your password. Please try again." };
  }
  return { success: "Password saved.", ok: Date.now() };
}
