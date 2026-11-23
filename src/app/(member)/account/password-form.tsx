"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { savePassword, type PasswordState } from "./actions";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(savePassword, {});
  return (
    <form action={action} key={state.ok} className="flex flex-col gap-4">
      {hasPassword ? (
        <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" required />
      ) : (
        <p className="text-sm text-muted">
          You sign in with email links. Set a password if you&rsquo;d also like to sign in with one.
        </p>
      )}
      <Field label="New password" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      <p className="-mt-2 font-mono text-xs text-dim">At least 8 characters.</p>
      <FormMessage error={state.error} success={state.success} />
      <span>
        <SubmitButton pending={pending} pendingText="Saving…">
          {hasPassword ? "Change password" : "Set password"}
        </SubmitButton>
      </span>
    </form>
  );
}
