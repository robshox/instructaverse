import type { ComponentProps } from "react";

export const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:outline-2 focus:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export function Field({ label, ...input }: { label: string } & ComponentProps<"input">) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input className={inputClass} {...input} />
    </label>
  );
}

export function SubmitButton({ pending, children, pendingText }: { pending: boolean; children: string; pendingText: string }) {
  return (
    <button
      disabled={pending}
      className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  return (
    <p aria-live="polite" className={`min-h-5 text-sm ${error ? "text-red-600" : "text-green-700 dark:text-green-400"}`}>
      {error ?? success}
    </p>
  );
}
