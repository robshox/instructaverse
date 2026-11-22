"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { completeSetup, type SetupState } from "./actions";

export function SetupForm() {
  const [state, action, pending] = useActionState<SetupState, FormData>(completeSetup, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Your name" name="name" autoComplete="name" required />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      <FormMessage error={state.error} />
      <SubmitButton pending={pending} pendingText="Creating account…">
        Create admin account
      </SubmitButton>
    </form>
  );
}
