import { describe, expect, it } from "vitest";
import { planCopy, splitPriceLabel } from "@/lib/plans/copy";

describe("plan card copy (AC-23)", () => {
  it("uses the first line as the summary and further lines as bullets", () => {
    expect(planCopy("Course plus community.\n- 32 lessons\n* Templates\n\n• A year of access")).toEqual({
      summary: "Course plus community.",
      bullets: ["32 lessons", "Templates", "A year of access"],
    });
  });
  it("handles one line and empty descriptions", () => {
    expect(planCopy("Pay once.")).toEqual({ summary: "Pay once.", bullets: [] });
    expect(planCopy("")).toEqual({ summary: null, bullets: [] });
  });
  it("splits a price label into amount and cadence", () => {
    expect(splitPriceLabel("€49 / month")).toEqual({ amount: "€49", cadence: "/ month" });
    expect(splitPriceLabel("$300 every 3 months")).toEqual({ amount: "$300", cadence: "every 3 months" });
    expect(splitPriceLabel("£199")).toEqual({ amount: "£199", cadence: "" });
  });
});
