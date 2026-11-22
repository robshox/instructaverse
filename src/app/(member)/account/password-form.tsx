"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { savePassword, type PasswordState } from "./actions";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(savePassword, {});
  return (
    <form action={action} key={state.ok} className="flex max-w-sm flex-col gap-4">
      {hasPassword ? (
        <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" required />
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You sign in with email links. Set a password if you&rsquo;d also like to sign in with one.
        </p>
      )}
      <Field label="New password" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      <FormMessage error={state.error} success={state.success} />
      <SubmitButton pending={pending} pendingText="Saving…">
        {hasPassword ? "Change password" : "Set password"}
      </SubmitButton>
    </form>
  );
}
