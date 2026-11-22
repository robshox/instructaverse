import { describe, expect, it } from "vitest";
import { EnvError, parseEnv } from "@/lib/env";

const valid = {
  BASE_URL: "https://community.example.com",
  AUTH_SECRET: "a".repeat(32),
  STRIPE_SECRET_KEY: "sk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_123",
  MUX_TOKEN_ID: "mux-id",
  MUX_TOKEN_SECRET: "mux-secret",
  MUX_SIGNING_KEY_ID: "mux-signing-id",
  MUX_SIGNING_PRIVATE_KEY: "mux-signing-key",
  MUX_WEBHOOK_SECRET: "mux-webhook",
  SMTP_HOST: "smtp.example.com",
  SMTP_FROM: "Community <hello@example.com>",
};

function without(...keys: (keyof typeof valid)[]) {
  return Object.fromEntries(Object.entries(valid).filter(([k]) => !keys.includes(k as keyof typeof valid)));
}

describe("parseEnv", () => {
  it("returns typed config with defaults when all required vars are set", () => {
    const env = parseEnv(valid);
    expect(env.BASE_URL).toBe("https://community.example.com");
    expect(env.DATA_DIR).toBe("/data");
    expect(env.SMTP_PORT).toBe(587);
  });

  it("names the missing variable", () => {
    const rest = without("STRIPE_SECRET_KEY");
    expect(() => parseEnv(rest)).toThrow(EnvError);
    expect(() => parseEnv(rest)).toThrow(/STRIPE_SECRET_KEY/);
  });

  it("names every missing variable at once", () => {
    const rest = without("SMTP_HOST", "MUX_TOKEN_ID");
    try {
      parseEnv(rest);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(EnvError);
      expect((e as EnvError).variables.sort()).toEqual(["MUX_TOKEN_ID", "SMTP_HOST"]);
    }
  });

  it("treats empty strings as missing", () => {
    expect(() => parseEnv({ ...valid, AUTH_SECRET: "" })).toThrow(/AUTH_SECRET/);
  });

  it("rejects an invalid BASE_URL and a short AUTH_SECRET", () => {
    expect(() => parseEnv({ ...valid, BASE_URL: "not a url" })).toThrow(/BASE_URL/);
    expect(() => parseEnv({ ...valid, AUTH_SECRET: "short" })).toThrow(/AUTH_SECRET/);
  });

  it("never includes secret values in the error message", () => {
    try {
      parseEnv({ ...valid, AUTH_SECRET: "tooshort-secret", BASE_URL: "nope" });
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).not.toContain("tooshort-secret");
    }
  });
});
