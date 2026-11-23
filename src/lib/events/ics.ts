import { canAccess, type Viewer } from "@/lib/access";
import { eventEnd, listEvents } from "./index";

// A single-event iCalendar file (RFC 5545) for Add to calendar (FR-7.2, AC-21).

type IcsEvent = { id: string; title: string; description: string; startsAt: Date; endsAt: Date | null; zoomUrl: string };

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (text: string) => text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Fold to 75 octets per line, continuing with a leading space, without splitting a character. */
function fold(line: string): string {
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch);
    const limit = out.length ? 74 : 75; // continuation lines start with a space
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildIcs(event: IcsEvent, brandName: string, now = new Date()): string {
  const description = [event.description.trim(), `Join: ${event.zoomUrl}`].filter(Boolean).join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${brandName.replace(/[/\r\n]/g, " ")}//Events//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@instructaverse`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(eventEnd(event))}`,
    `SUMMARY:${escape(event.title)}`,
    `DESCRIPTION:${escape(description)}`,
    `LOCATION:${escape(event.zoomUrl)}`,
    `URL:${event.zoomUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** The .ics for an event the viewer can see; null if it doesn't exist or they can't see it. */
export async function calendarFor(viewer: Viewer, eventId: string, brandName: string): Promise<string | null> {
  const event = (await listEvents()).find((e) => e.id === eventId);
  if (!event || !viewer || !(await canAccess(viewer, event.groupIds))) return null;
  return buildIcs(event, brandName);
}
