import { afterEach, describe, expect, it, vi } from "vitest";
import { getBrand, pageTitle } from "@/lib/brand";

afterEach(() => vi.unstubAllEnvs());

describe("brand (AC-3)", () => {
  it("defaults to Switch Dimension", () => {
    vi.stubEnv("BRAND_NAME", "");
    vi.stubEnv("BRAND_LOGO_URL", "");
    vi.stubEnv("BRAND_TAGLINE", "");
    expect(getBrand()).toEqual({
      name: "Switch Dimension Accelerator",
      logoUrl: "https://switchdimension.com/site/logo.png",
      tagline: "Trust what your agents ship.",
    });
  });

  it("uses BRAND_* env vars when set", () => {
    vi.stubEnv("BRAND_NAME", "Acme Academy");
    vi.stubEnv("BRAND_LOGO_URL", "https://acme.example/logo.svg");
    vi.stubEnv("BRAND_TAGLINE", "Learn by building.");
    expect(getBrand()).toEqual({ name: "Acme Academy", logoUrl: "https://acme.example/logo.svg", tagline: "Learn by building." });
  });

  it("ignores a logo URL that isn't http(s)", () => {
    vi.stubEnv("BRAND_LOGO_URL", "javascript:alert(1)");
    expect(getBrand().logoUrl).toBe("https://switchdimension.com/site/logo.png");
  });

  it("builds page titles as '<page> · <brand>'", () => {
    vi.stubEnv("BRAND_NAME", "Acme Academy");
    expect(pageTitle("Courses")).toBe("Courses · Acme Academy");
  });
});
