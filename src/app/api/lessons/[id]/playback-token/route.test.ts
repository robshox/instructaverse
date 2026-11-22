import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({ getViewer: vi.fn(async () => ({ id: "m1", role: "member" })) }));
vi.mock("@/lib/mux", () => ({
  playbackFor: vi.fn(async (_viewer: unknown, id: string) =>
    id === "allowed" ? { playbackId: "P", tokens: { playback: "a", thumbnail: "b", storyboard: "c" } } : null,
  ),
}));

const { GET } = await import("./route");
const call = (id: string) => GET(new Request(`http://localhost/api/lessons/${id}/playback-token`), { params: Promise.resolve({ id }) });

describe("GET /api/lessons/[id]/playback-token", () => {
  it("returns signed playback for allowed lessons, never cached", async () => {
    const res = await call("allowed");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toMatchObject({ playbackId: "P", tokens: { playback: "a" } });
  });

  it("AC-18: refuses with 403 and no token otherwise", async () => {
    const res = await call("other");
    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).not.toContain("token\":\"");
  });
});
