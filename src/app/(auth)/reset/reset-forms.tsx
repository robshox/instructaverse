"use client";

import { useActionState } from "react";
import { Field, FormMessage, PromptField, SubmitButton } from "@/components/form";
import { requestReset, setNewPassword, type FormState } from "./actions";

export function RequestResetForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestReset, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <PromptField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        button={
          <SubmitButton pending={pending} pendingText="Sending…">
            Email me a reset link
          </SubmitButton>
        }
      />
      <FormMessage error={state.error} success={state.success} />
    </form>
  );
}

export function NewPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setNewPassword, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field label="New password" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      <FormMessage error={state.error} />
      <SubmitButton pending={pending} pendingText="Saving…">
        Set new password
      </SubmitButton>
    </form>
  );
}
