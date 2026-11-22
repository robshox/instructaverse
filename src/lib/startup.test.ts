import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listBoards } from "@/lib/community/boards";
import { runStartup } from "@/lib/startup";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("server startup", () => {
  it("in production, exits non-zero naming any missing variable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const exit = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit ${code}`);
    }) as never);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(runStartup()).rejects.toThrow("exit 1");
    expect(exit).toHaveBeenCalledWith(1);
    expect(log.mock.calls.flat().join("\n")).toMatch(/STRIPE_SECRET_KEY/);
  });

  it("applies database migrations and creates the General board, safely on every start", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await runStartup();
    expect(existsSync(join(process.env.DATA_DIR!, "app.db"))).toBe(true);
    await runStartup();
    expect((await listBoards()).map((b) => b.name)).toEqual(["General"]);
  });

  it("does nothing during next build", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.stubEnv("NODE_ENV", "production");
    const exit = vi.spyOn(process, "exit");
    await runStartup();
    expect(exit).not.toHaveBeenCalled();
  });
});
