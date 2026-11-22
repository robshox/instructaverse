import { beforeAll, describe, expect, it } from "vitest";
import { db, migrateDb } from "@/db";
import { user } from "@/db/schema";
import { createGroup, grantMembership } from "@/lib/access";
import { createEvent, EventInputError, eventEnd, listEventsFor, updateEvent, utcToZonedInput, zonedTimeToUtc } from "@/lib/events";

const HOUR = 3_600_000;
const member = { id: "m1", role: "member" };
const outsider = { id: "m2", role: "member" };
const admin = { id: "admin", role: "admin" };
let pro: { id: string };

beforeAll(async () => {
  migrateDb();
  await db.insert(user).values([
    { id: "m1", name: "M", email: "m1@example.com", role: "member" },
    { id: "m2", name: "O", email: "m2@example.com", role: "member" },
  ]);
  pro = await createGroup("Pro");
  await grantMembership({ userId: "m1", groupId: pro.id, source: "manual", sourceRef: "admin" });
});

describe("time zones", () => {
  it("converts organiser wall-clock time to UTC, including across daylight saving", () => {
    expect(zonedTimeToUtc("2026-12-01T18:00", "Europe/Dublin").toISOString()).toBe("2026-12-01T18:00:00.000Z"); // GMT
    expect(zonedTimeToUtc("2026-07-01T18:00", "Europe/Dublin").toISOString()).toBe("2026-07-01T17:00:00.000Z"); // IST, UTC+1
    expect(zonedTimeToUtc("2026-07-01T18:00", "America/New_York").toISOString()).toBe("2026-07-01T22:00:00.000Z"); // EDT
    expect(zonedTimeToUtc("2026-12-01T09:30", "Asia/Kolkata").toISOString()).toBe("2026-12-01T04:00:00.000Z"); // UTC+5:30
  });

  it("round-trips back to the form value", () => {
    const utc = zonedTimeToUtc("2026-07-01T18:00", "America/New_York");
    expect(utcToZonedInput(utc, "America/New_York")).toBe("2026-07-01T18:00");
  });
});

describe("events", () => {
  const base = () => ({
    title: "Live Q&A",
    description: "Bring your questions",
    startsLocal: "2030-03-10T18:00",
    endsLocal: "",
    timezone: "Europe/Dublin",
    zoomUrl: "https://zoom.us/j/123456789",
    groupIds: [pro.id],
  });

  it("validates input", async () => {
    await expect(createEvent({ ...base(), title: " " })).rejects.toBeInstanceOf(EventInputError);
    await expect(createEvent({ ...base(), zoomUrl: "javascript:alert(1)" })).rejects.toThrow(/https/);
    await expect(createEvent({ ...base(), zoomUrl: "http://zoom.us/j/1" })).rejects.toThrow(/https/);
    await expect(createEvent({ ...base(), timezone: "Mars/Olympus" })).rejects.toThrow(/time zone/);
    await expect(createEvent({ ...base(), endsLocal: "2030-03-10T17:00" })).rejects.toThrow(/after/);
  });

  it("AC-27: members of the group see the event and its Zoom link; others see neither", async () => {
    await createEvent(base());
    const mine = await listEventsFor(member, new Date("2030-03-01T00:00:00Z"));
    expect(mine.upcoming).toEqual([expect.objectContaining({ title: "Live Q&A", zoomUrl: "https://zoom.us/j/123456789", timezone: "Europe/Dublin" })]);
    const theirs = await listEventsFor(outsider, new Date("2030-03-01T00:00:00Z"));
    expect(theirs).toEqual({ upcoming: [], past: [] });
    expect(JSON.stringify(theirs)).not.toContain("zoom.us");
  });

  it("AC-28: moves to past once it ends; with no end time, two hours after the start", async () => {
    const { id } = await createEvent({ ...base(), title: "Workshop", startsLocal: "2030-04-01T10:00", endsLocal: "2030-04-01T11:30", timezone: "UTC" });
    const { id: noEnd } = await createEvent({ ...base(), title: "Office hours", startsLocal: "2030-04-02T10:00", timezone: "UTC" });
    const titles = async (iso: string) => {
      const r = await listEventsFor(admin, new Date(iso));
      return { upcoming: r.upcoming.map((e) => e.title), past: r.past.map((e) => e.title) };
    };

    expect((await titles("2030-04-01T11:00:00Z")).upcoming).toContain("Workshop"); // happening now
    expect((await titles("2030-04-01T11:31:00Z")).past).toContain("Workshop");
    expect((await titles("2030-04-02T11:59:00Z")).upcoming).toContain("Office hours");
    expect((await titles("2030-04-02T12:00:00Z")).past).toContain("Office hours");
    expect(eventEnd({ startsAt: new Date("2030-04-02T10:00:00Z"), endsAt: null }).getTime()).toBe(Date.parse("2030-04-02T10:00:00Z") + 2 * HOUR);

    // Upcoming soonest first, past most recent first.
    const later = await titles("2030-05-01T00:00:00Z");
    expect(later.past.slice(0, 2)).toEqual(["Office hours", "Workshop"]);
    await updateEvent(id, { ...base(), title: "Workshop (moved)", startsLocal: "2030-06-01T10:00", endsLocal: "", timezone: "UTC" });
    expect((await titles("2030-05-01T00:00:00Z")).upcoming).toContain("Workshop (moved)");
    expect(noEnd).toBeTruthy();
  });

  it("events with no groups are admin-only", async () => {
    await createEvent({ ...base(), title: "Admin sync", groupIds: [] });
    const now = new Date("2030-03-01T00:00:00Z");
    expect((await listEventsFor(admin, now)).upcoming.map((e) => e.title)).toContain("Admin sync");
    expect((await listEventsFor(member, now)).upcoming.map((e) => e.title)).not.toContain("Admin sync");
  });
});
