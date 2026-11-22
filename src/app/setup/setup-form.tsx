"use client";

import { useActionState } from "react";
import { completeSetup, type SetupState } from "./actions";

const field =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:outline-2 focus:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export function SetupForm() {
  const [state, action, pending] = useActionState<SetupState, FormData>(completeSetup, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Your name
        <input name="name" autoComplete="name" required className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input name="email" type="email" autoComplete="email" required className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={field}
        />
      </label>
      <p aria-live="polite" className="min-h-5 text-sm text-red-600">
        {state.error}
      </p>
      <button
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Creating account…" : "Create admin account"}
      </button>
    </form>
  );
}
