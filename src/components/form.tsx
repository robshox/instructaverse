import type { ComponentProps } from "react";

export const inputClass =
  "w-full rounded-md border border-line-strong bg-raised px-3 py-2.5 text-fg placeholder:text-dim focus:border-accent focus:outline-none";

export const labelClass = "flex flex-col gap-1.5 font-mono text-[11px] uppercase tracking-[.06em] text-muted";

export function Field({ label, ...input }: { label: string } & ComponentProps<"input">) {
  return (
    <label className={labelClass}>
      {label}
      <input className={`${inputClass} font-sans text-[15px] tracking-normal normal-case`} {...input} />
    </label>
  );
}

export function SubmitButton({ pending, children, pendingText }: { pending: boolean; children: string; pendingText: string }) {
  return (
    <button
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-[18px] py-[9px] text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  return (
    <p aria-live="polite" className={`min-h-5 text-sm ${error ? "text-danger" : "text-ok"}`}>
      {error ?? success}
    </p>
  );
}
