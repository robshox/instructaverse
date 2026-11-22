"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * A time shown in the viewer's own time zone (AC-27). The server doesn't know
 * the viewer's zone, so the server render shows the organiser's zone and the
 * browser swaps in local time.
 */
export function LocalTime({ iso, fallbackZone, withZoneName = true }: { iso: string; fallbackZone: string; withZoneName?: boolean }) {
  const local = useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
  const zone = local ?? fallbackZone;
  const text = new Intl.DateTimeFormat("en", {
    timeZone: zone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: withZoneName ? "short" : undefined,
  }).format(new Date(iso));
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}

/** Month and day in the viewer's zone, as a small calendar block (home sidebar, events list). */
export function DateBlock({ iso, fallbackZone }: { iso: string; fallbackZone: string }) {
  const local = useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
  const zone = local ?? fallbackZone;
  const date = new Date(iso);
  const month = new Intl.DateTimeFormat("en", { timeZone: zone, month: "short" }).format(date).toUpperCase();
  const day = new Intl.DateTimeFormat("en", { timeZone: zone, day: "2-digit" }).format(date);
  return (
    <div aria-hidden suppressHydrationWarning className="shrink-0 rounded-md border border-line-strong px-2.5 py-1.5 text-center font-mono leading-tight">
      <div className="text-[11px] text-accent" suppressHydrationWarning>{month}</div>
      <div className="text-xl" suppressHydrationWarning>{day}</div>
    </div>
  );
}
