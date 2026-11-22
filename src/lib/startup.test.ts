import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runStartup } from "@/lib/startup";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("server startup", () => {
  it("in production, exits non-zero naming any missing variable", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const exit = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit ${code}`);
    }) as never);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => runStartup()).toThrow("exit 1");
    expect(exit).toHaveBeenCalledWith(1);
    expect(log.mock.calls.flat().join("\n")).toMatch(/STRIPE_SECRET_KEY/);
  });

  it("applies database migrations so a fresh volume is ready", () => {
    vi.stubEnv("NODE_ENV", "development");
    runStartup();
    expect(existsSync(join(process.env.DATA_DIR!, "app.db"))).toBe(true);
    runStartup(); // safe to run again on every start
  });

  it("does nothing during next build", () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.stubEnv("NODE_ENV", "production");
    const exit = vi.spyOn(process, "exit");
    runStartup();
    expect(exit).not.toHaveBeenCalled();
  });
});
