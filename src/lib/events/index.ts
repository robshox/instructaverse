import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { eventGroups, events } from "@/db/schema";
import { canAccess, type Viewer } from "@/lib/access";

export class EventInputError extends Error {}

const TWO_HOURS = 2 * 3_600_000;

// ---- time zones (Intl only, no dependency) ----

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Wall-clock parts of `date` in `tz`. */
function wallClock(date: Date, tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return { y: +parts.year!, m: +parts.month!, d: +parts.day!, h: +parts.hour!, mi: +parts.minute!, s: +parts.second! };
}

/** How far `tz` is ahead of UTC at `date`, in ms. */
function offsetAt(date: Date, tz: string): number {
  const w = wallClock(date, tz);
  return Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s) - (date.getTime() - date.getMilliseconds());
}

/** "2026-07-01T18:00" in America/New_York → the UTC instant. */
export function zonedTimeToUtc(local: string, tz: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) throw new EventInputError("Enter a date and time");
  const [, y, m, d, h, mi] = match.map(Number) as number[];
  const asUtc = Date.UTC(y!, m! - 1, d!, h!, mi!);
  // Two passes settle the offset across daylight-saving changes.
  let guess = asUtc - offsetAt(new Date(asUtc), tz);
  guess = asUtc - offsetAt(new Date(guess), tz);
  return new Date(guess);
}

/** The UTC instant as a datetime-local value in `tz` (for edit forms). */
export function utcToZonedInput(date: Date, tz: string): string {
  const w = wallClock(date, tz);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${w.y}-${p(w.m)}-${p(w.d)}T${p(w.h)}:${p(w.mi)}`;
}

// ---- events ----

export type EventInput = {
  title: string;
  description: string;
  startsLocal: string;
  endsLocal: string;
  timezone: string;
  zoomUrl: string;
  groupIds: string[];
  externalId?: string | null;
};

function parse(input: EventInput) {
  const title = input.title.trim();
  if (!title) throw new EventInputError("Enter a title");
  if (!isValidTimeZone(input.timezone)) throw new EventInputError("Choose a valid time zone");
  let url: URL;
  try {
    url = new URL(input.zoomUrl.trim());
  } catch {
    throw new EventInputError("Enter the meeting link (https://…)");
  }
  if (url.protocol !== "https:") throw new EventInputError("The meeting link must start with https://");
  const startsAt = zonedTimeToUtc(input.startsLocal, input.timezone);
  const endsAt = input.endsLocal ? zonedTimeToUtc(input.endsLocal, input.timezone) : null;
  if (endsAt && endsAt <= startsAt) throw new EventInputError("The end time must be after the start time");
  return {
    title,
    description: input.description.trim(),
    startsAt,
    endsAt,
    timezone: input.timezone,
    zoomUrl: url.toString(),
    groupIds: [...new Set(input.groupIds)],
  };
}

function writeGroups(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], id: string, groupIds: string[]) {
  tx.delete(eventGroups).where(eq(eventGroups.eventId, id)).run();
  if (groupIds.length) tx.insert(eventGroups).values(groupIds.map((groupId) => ({ eventId: id, groupId }))).run();
}

export async function createEvent(input: EventInput): Promise<{ id: string }> {
  const { groupIds, ...data } = parse(input);
  const id = crypto.randomUUID();
  db.transaction((tx) => {
    tx.insert(events).values({ id, ...data, externalId: input.externalId ?? null }).run();
    writeGroups(tx, id, groupIds);
  });
  return { id };
}

export async function updateEvent(id: string, input: EventInput) {
  const { groupIds, ...data } = parse(input);
  db.transaction((tx) => {
    tx.update(events).set(data).where(eq(events.id, id)).run();
    writeGroups(tx, id, groupIds);
  });
}

export async function deleteEvent(id: string) {
  await db.delete(events).where(eq(events.id, id));
}

export type EventView = typeof events.$inferSelect & { groupIds: string[] };

/** When an event counts as over: its end, or two hours after the start if there's no end (AC-28). */
export function eventEnd(e: { startsAt: Date; endsAt: Date | null }): Date {
  return e.endsAt ?? new Date(e.startsAt.getTime() + TWO_HOURS);
}

export async function listEvents(): Promise<EventView[]> {
  const rows = await db.select().from(events).orderBy(asc(events.startsAt));
  if (!rows.length) return [];
  const links = await db.select().from(eventGroups).where(inArray(eventGroups.eventId, rows.map((r) => r.id)));
  return rows.map((r) => ({ ...r, groupIds: links.filter((l) => l.eventId === r.id).map((l) => l.groupId) }));
}

/**
 * AC-27/AC-28: events this viewer may see (and so their links), split into
 * upcoming (soonest first, including ones in progress) and past (latest first).
 */
export async function listEventsFor(viewer: Viewer, now = new Date()): Promise<{ upcoming: EventView[]; past: EventView[] }> {
  const all = await listEvents();
  const visible = await Promise.all(all.map((e) => canAccess(viewer, e.groupIds, now)));
  const mine = all.filter((_, i) => visible[i]);
  return {
    upcoming: mine.filter((e) => eventEnd(e) > now),
    past: mine.filter((e) => eventEnd(e) <= now).reverse(),
  };
}
