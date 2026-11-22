import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({ getViewer: vi.fn(async () => ({ id: "m1", role: "member" })) }));
vi.mock("@/lib/uploads", () => ({
  mediaForViewer: vi.fn(async (_v: unknown, path: string) =>
    path === "posts/ok.png" ? { data: Buffer.from([1, 2, 3]), contentType: "image/png" } : null,
  ),
}));

const { GET } = await import("./route");
const call = (path: string[]) => GET(new Request("http://localhost/media/x"), { params: Promise.resolve({ path }) });

describe("GET /media/[...path]", () => {
  it("serves allowed images privately, with nosniff", async () => {
    const res = await call(["posts", "ok.png"]);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("AC-26: refuses anything else with the same 404", async () => {
    expect((await call(["posts", "secret.png"])).status).toBe(404);
  });
});
