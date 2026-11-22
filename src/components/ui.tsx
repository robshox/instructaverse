import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Switch Dimension UI primitives (spec FR-1.3). Server-safe: no client hooks.

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost" | "success";
type Size = "sm" | "md";

const pillBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border font-medium tracking-[-.01em] transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const pillVariants: Record<Variant, string> = {
  primary: "border-transparent bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "border-line-strong text-fg hover:border-muted",
  outline: "border-accent text-fg hover:bg-accent hover:text-on-accent",
  danger: "border-danger/50 text-danger hover:bg-danger hover:text-fg",
  ghost: "border-transparent text-muted hover:text-fg",
  success: "border-ok text-ok hover:bg-ok/10",
};
const pillSizes: Record<Size, string> = { sm: "px-3.5 py-1.5 text-[13px]", md: "px-[18px] py-[9px] text-sm" };

export function pillClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${pillBase} ${pillVariants[variant]} ${pillSizes[size]} ${extra}`.trim();
}

export function Pill({ variant, size, className = "", ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={pillClass(variant, size, className)} {...rest} />;
}

export function PillLink({ variant, size, className = "", ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={pillClass(variant, size, className)} {...rest} />;
}

export function Card({ className = "", ...rest }: ComponentProps<"div">) {
  return <div className={`rounded-md border border-line bg-surface ${className}`} {...rest} />;
}

/** Mono uppercase label. `accent` renders first, in the accent colour (e.g. "01", "Module 02"). */
export function Eyebrow({ accent, children, className = "" }: { accent?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-xs uppercase tracking-[.04em] text-muted ${className}`}>
      {accent ? <b className="font-normal text-accent">{accent}</b> : null}
      {accent && children ? <span aria-hidden> · </span> : null}
      {children}
    </p>
  );
}

const tagTones = {
  default: "border-line-strong text-[#d6d6d6]",
  dim: "border-dashed border-line-strong text-dim",
  accent: "border-accent/50 text-accent",
  ok: "border-ok/40 text-ok",
  warn: "border-warn/40 text-warn",
  danger: "border-danger/40 text-danger",
};

export function Tag({ tone = "default", children, className = "" }: { tone?: keyof typeof tagTones; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[.04em] ${tagTones[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** A checkbox styled as a selectable chip (lights up orange when checked). Works in plain forms. */
export function ChipCheckbox({ children, ...input }: { children: ReactNode } & ComponentProps<"input">) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-[13px] text-muted transition-colors has-checked:border-accent has-checked:bg-accent/10 has-checked:text-fg has-focus-visible:outline-2 has-focus-visible:outline-accent">
      <input type="checkbox" className="sr-only" {...input} />
      {children}
    </label>
  );
}

export function ProgressBar({ value, max, label, className = "" }: { value: number; max: number; label?: string; className?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label ?? "Progress"}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`h-1 overflow-hidden rounded-full bg-line ${className}`}
    >
      <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
    </div>
  );
}

const avatarTints = ["bg-[#2a1406] text-accent", "bg-[#14261d] text-ok", "bg-[#1d1d2b] text-[#a5a5ff]", "bg-[#2b1420] text-[#ff8fb0]", "bg-[#2a2508] text-warn"];

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

/** Initials in a tinted circle; the tint is stable per name. */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-mono ${avatarTints[hash % avatarTints.length]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials(name)}
    </span>
  );
}

/** Page heading: eyebrow, large tight title, optional lede. */
export function PageHeader({ eyebrow, title, lede, children }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        {eyebrow ? <div className="mb-3">{eyebrow}</div> : null}
        <h1 className="text-[44px] leading-[1.05] font-medium tracking-[-.04em]">{title}</h1>
        {lede ? <p className="mt-2 max-w-xl text-muted">{lede}</p> : null}
      </div>
      {children}
    </div>
  );
}
