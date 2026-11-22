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
