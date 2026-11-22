import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/billing/prices";

describe("formatPrice", () => {
  it("formats one-off and recurring prices", () => {
    expect(formatPrice({ unit_amount: 19900, currency: "eur", recurring: null })).toBe("€199");
    expect(formatPrice({ unit_amount: 4950, currency: "usd", recurring: { interval: "month", interval_count: 1 } as never })).toBe(
      "$49.50 / month",
    );
    expect(formatPrice({ unit_amount: 30000, currency: "gbp", recurring: { interval: "month", interval_count: 3 } as never })).toBe(
      "£300 every 3 months",
    );
    expect(formatPrice({ unit_amount: null, currency: "usd", recurring: null })).toBeNull();
  });
});
