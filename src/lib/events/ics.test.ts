import { beforeAll, describe, expect, it } from "vitest";
import { db, migrateDb } from "@/db";
import { user } from "@/db/schema";
import { createGroup, grantMembership } from "@/lib/access";
import { createEvent } from "@/lib/events";
import { buildIcs, calendarFor } from "@/lib/events/ics";

const member = { id: "m1", role: "member" };
const outsider = { id: "m2", role: "member" };
let withEnd: string, noEnd: string;

beforeAll(async () => {
  migrateDb();
  await db.insert(user).values([
    { id: "m1", name: "Ada", email: "m1@example.com", role: "member" },
    { id: "m2", name: "Out", email: "m2@example.com", role: "member" },
  ]);
  const pro = await createGroup("Pro");
  await grantMembership({ userId: "m1", groupId: pro.id, source: "manual", sourceRef: "admin" });
  withEnd = (
    await createEvent({
      title: "Live Q&A, shipping agents",
      description: "Bring questions; we'll go deep.\nSecond line",
      startsLocal: "2030-12-03T17:00",
      endsLocal: "2030-12-03T18:00",
      timezone: "Europe/London",
      zoomUrl: "https://zoom.us/j/123",
      groupIds: [pro.id],
    })
  ).id;
  noEnd = (
    await createEvent({ title: "Office hours", description: "", startsLocal: "2030-06-01T09:00", endsLocal: "", timezone: "America/New_York", zoomUrl: "https://zoom.us/j/9", groupIds: [pro.id] })
  ).id;
});

describe(".ics for an event (AC-21)", () => {
  it("has the title, UTC start and end, description and Zoom URL, escaped", async () => {
    const ics = await calendarFor(member, withEnd, "Test Brand");
    expect(ics).not.toBeNull();
    const lines = ics!.replace(/\r\n /g, "").split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(lines).toContain("PRODID:-//Test Brand//Events//EN");
    expect(lines).toContain(`UID:${withEnd}@instructaverse`);
    expect(lines).toContain("DTSTART:20301203T170000Z");
    expect(lines).toContain("DTEND:20301203T180000Z");
    expect(lines).toContain("SUMMARY:Live Q&A\\, shipping agents");
    expect(lines).toContain("DESCRIPTION:Bring questions\; we'll go deep.\\nSecond line\\n\\nJoin: https://zoom.us/j/123");
    expect(lines).toContain("URL:https://zoom.us/j/123");
    expect(lines).toContain("LOCATION:https://zoom.us/j/123");
    expect(lines.at(-2)).toBe("END:VCALENDAR");
    expect(ics!.endsWith("\r\n")).toBe(true);
  });

  it("uses start + 2h when there is no end", async () => {
    const ics = (await calendarFor(member, noEnd, "B"))!;
    expect(ics).toContain("DTSTART:20300601T130000Z");
    expect(ics).toContain("DTEND:20300601T150000Z");
  });

  it("is null for an event the viewer can't see, or one that doesn't exist", async () => {
    expect(await calendarFor(outsider, withEnd, "B")).toBeNull();
    expect(await calendarFor(null, withEnd, "B")).toBeNull();
    expect(await calendarFor(member, "nope", "B")).toBeNull();
  });

  it("folds lines longer than 75 octets", () => {
    const ics = buildIcs(
      { id: "e", title: "x".repeat(200), description: "", startsAt: new Date(0), endsAt: null, zoomUrl: "https://zoom.us/j/1" },
      "B",
      new Date(0),
    );
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    expect(ics).toContain("\r\n x");
  });
});
