"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createFirstAdmin, SetupAlreadyCompleteError } from "@/lib/setup";

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export type SetupState = { error?: string };

export async function completeSetup(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };

  try {
    await createFirstAdmin(parsed.data);
  } catch (e) {
    if (e instanceof SetupAlreadyCompleteError) redirect("/");
    return { error: "Couldn't create the account. Please try again." };
  }
  redirect("/");
}
