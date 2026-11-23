import { describe, expect, it } from "vitest";
import { daysAway } from "@/components/local-time";

describe("days until an event, in the viewer's zone (AC-20)", () => {
  const now = new Date("2030-01-10T23:30:00Z");
  it("counts calendar days in that zone", () => {
    expect(daysAway("2030-01-11T08:00:00Z", "UTC", now)).toBe(1);
    expect(daysAway("2030-01-11T08:00:00Z", "America/New_York", now)).toBe(1);
    expect(daysAway("2030-01-11T00:30:00Z", "Europe/Paris", now)).toBe(0);
    expect(daysAway("2030-01-21T12:00:00Z", "UTC", now)).toBe(11);
  });
  it("is 0 for an event already in progress", () => {
    expect(daysAway("2030-01-10T22:00:00Z", "UTC", now)).toBe(0);
  });
});
