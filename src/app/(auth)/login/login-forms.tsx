"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { sendMagicLink, signInWithPassword, type FormState } from "./actions";

export function LoginForms() {
  const [link, linkAction, linkPending] = useActionState<FormState, FormData>(sendMagicLink, {});
  const [pw, pwAction, pwPending] = useActionState<FormState, FormData>(signInWithPassword, {});

  return (
    <div className="flex flex-col gap-8">
      <form action={linkAction} className="flex flex-col gap-4">
        <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={link.email} key={link.email} />
        <FormMessage error={link.error} success={link.success} />
        <SubmitButton pending={linkPending} pendingText="Sending…">
          Email me a sign-in link
        </SubmitButton>
      </form>

      <details className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <summary className="cursor-pointer text-sm font-medium">Sign in with a password instead</summary>
        <form action={pwAction} className="mt-4 flex flex-col gap-4">
          <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={pw.email} key={pw.email} />
          <Field label="Password" name="password" type="password" autoComplete="current-password" required />
          <FormMessage error={pw.error} />
          <SubmitButton pending={pwPending} pendingText="Signing in…">
            Sign in
          </SubmitButton>
          <Link href="/reset" className="text-sm underline">
            Forgot your password?
          </Link>
        </form>
      </details>
    </div>
  );
}
