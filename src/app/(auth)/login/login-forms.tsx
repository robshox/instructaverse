"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, PromptField, SubmitButton } from "@/components/form";
import { sendMagicLink, signInWithPassword, type FormState } from "./actions";

export function LoginForms() {
  const [link, linkAction, linkPending] = useActionState<FormState, FormData>(sendMagicLink, {});
  const [pw, pwAction, pwPending] = useActionState<FormState, FormData>(signInWithPassword, {});

  return (
    <div className="flex flex-col">
      <form action={linkAction} className="flex flex-col gap-2">
        <PromptField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          defaultValue={link.email}
          key={link.email}
          button={
            <SubmitButton pending={linkPending} pendingText="Sending…">
              Email me a sign-in link
            </SubmitButton>
          }
        />
        <FormMessage error={link.error} success={link.success} />
      </form>

      <div className="my-5 flex items-center gap-3.5" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        <span className="rounded-full border border-line-strong px-2 py-0.5 font-mono text-[11px] text-dim">OR</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <details className="group rounded-md border border-line bg-surface px-[18px] py-4">
        <summary className="flex cursor-pointer list-none justify-between font-mono text-xs uppercase tracking-[.04em] text-muted [&::-webkit-details-marker]:hidden">
          <span>Sign in with a password instead</span>
          <span aria-hidden className="text-accent group-open:hidden">
            +
          </span>
          <span aria-hidden className="hidden text-accent group-open:inline">
            −
          </span>
        </summary>
        <form action={pwAction} className="mt-4 flex flex-col gap-4">
          <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={pw.email} key={pw.email} />
          <Field label="Password" name="password" type="password" autoComplete="current-password" required />
          <FormMessage error={pw.error} />
          <SubmitButton pending={pwPending} pendingText="Signing in…">
            Sign in
          </SubmitButton>
        </form>
      </details>
      <p className="mt-[22px] font-mono text-xs text-dim">
        Trouble signing in?{" "}
        <Link href="/reset" className="text-muted underline underline-offset-[3px] hover:text-fg">
          Forgot your password?
        </Link>
      </p>
    </div>
  );
}
