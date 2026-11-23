"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * The viewer's own time zone (AC-27). The server doesn't know it, so the server
 * render uses the organiser's zone and the browser swaps in local time.
 */
export function useViewerZone(fallbackZone: string): string {
  const local = useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
  return local ?? fallbackZone;
}

const fmt = (zone: string, options: Intl.DateTimeFormatOptions, date: Date) => new Intl.DateTimeFormat("en", { timeZone: zone, ...options }).format(date);

/** A time shown in the viewer's own time zone. */
export function LocalTime({ iso, fallbackZone, withZoneName = true }: { iso: string; fallbackZone: string; withZoneName?: boolean }) {
  const zone = useViewerZone(fallbackZone);
  const text = fmt(
    zone,
    { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: withZoneName ? "short" : undefined },
    new Date(iso),
  );
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}

/** "5:00 – 6:00 PM GMT" (or a single time), in the viewer's zone. */
export function LocalTimeRange({ startIso, endIso, fallbackZone }: { startIso: string; endIso?: string | null; fallbackZone: string }) {
  const zone = useViewerZone(fallbackZone);
  const start = new Date(startIso);
  const text = endIso
    ? new Intl.DateTimeFormat("en", { timeZone: zone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).formatRange(start, new Date(endIso))
    : fmt(zone, { hour: "numeric", minute: "2-digit", timeZoneName: "short" }, start);
  return (
    <time dateTime={startIso} suppressHydrationWarning>
      {text}
    </time>
  );
}

/** Month, day and (optionally) weekday in the viewer's zone, as a calendar block. */
export function DateBlock({ iso, fallbackZone, weekday = false, size = "sm", muted = false }: { iso: string; fallbackZone: string; weekday?: boolean; size?: "sm" | "lg"; muted?: boolean }) {
  const zone = useViewerZone(fallbackZone);
  const date = new Date(iso);
  const month = fmt(zone, { month: "short" }, date).toUpperCase();
  const day = fmt(zone, { day: "2-digit" }, date);
  const lg = size === "lg";
  return (
    <div
      aria-hidden
      className={`shrink-0 rounded-md border text-center font-mono leading-tight ${muted ? "border-line" : "border-line-strong"} ${lg ? "w-[84px] py-2.5" : "px-2.5 py-1.5"}`}
    >
      <div className={`${lg ? "text-xs tracking-[.06em]" : "text-[11px]"} ${muted ? "text-dim" : "text-accent"}`} suppressHydrationWarning>
        {month}
      </div>
      <div className={lg ? "text-[32px] font-medium tracking-[-.02em]" : "text-xl"} suppressHydrationWarning>
        {day}
      </div>
      {weekday ? (
        <div className="text-[11px] tracking-[.06em] text-muted" suppressHydrationWarning>
          {fmt(zone, { weekday: "short" }, date).toUpperCase()}
        </div>
      ) : null}
    </div>
  );
}

/** Calendar days from today to `iso` in the given zone (0 = today). */
export function daysAway(iso: string, zone: string, now = new Date()): number {
  const day = (d: Date) => Date.parse(new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d));
  return Math.max(0, Math.round((day(new Date(iso)) - day(now)) / 86_400_000));
}

/** "TODAY" or "IN N DAYS" for an upcoming event, in the viewer's zone (AC-20). */
export function DaysAwayBadge({ iso, fallbackZone }: { iso: string; fallbackZone: string }) {
  const zone = useViewerZone(fallbackZone);
  const n = daysAway(iso, zone);
  return (
    <span className="rounded-full border border-accent/50 px-2.5 py-0.5 font-mono text-[11px] tracking-[.04em] whitespace-nowrap text-accent" suppressHydrationWarning>
      {n === 0 ? "TODAY" : `IN ${n} ${n === 1 ? "DAY" : "DAYS"}`}
    </span>
  );
}

/** The viewer's zone name, e.g. "Europe/Dublin". */
export function ViewerZoneName({ fallbackZone }: { fallbackZone: string }) {
  const zone = useViewerZone(fallbackZone);
  return <span suppressHydrationWarning>{zone}</span>;
}
