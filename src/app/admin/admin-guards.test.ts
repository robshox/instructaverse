import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { migrateDb } from "@/db";
import { createGroup } from "@/lib/access";
import { createBoard, listBoards } from "@/lib/community/boards";
import { createPlan, getPlan } from "@/lib/plans";

// requireAdmin as it behaves for a signed-in member: notFound() throws.
const requireAdmin = vi.fn();
vi.mock("@/lib/session", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const { reorderBoardsAction } = await import("@/app/admin/reorder-actions");
const { setPlanListedAction } = await import("@/app/admin/plans/actions");

beforeAll(() => migrateDb());
beforeEach(() => {
  requireAdmin.mockReset();
  requireAdmin.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;404"));
});

describe("admin-only actions refuse non-admins (AC-29, AC-31)", () => {
  it("reorder: refused and the order is unchanged", async () => {
    await createBoard({ name: "Guard A", groupIds: [] });
    await createBoard({ name: "Guard B", groupIds: [] });
    const before = (await listBoards()).map((b) => b.id);
    await expect(reorderBoardsAction([...before].reverse())).rejects.toThrow();
    expect((await listBoards()).map((b) => b.id)).toEqual(before);
  });

  it("listed toggle: refused and the plan is unchanged", async () => {
    const g = await createGroup("Guard group");
    const { id } = await createPlan({ name: "Guard plan", description: "", type: "one_off", stripePriceIds: ["price_guard"], groupIds: [g.id], listed: true });
    await expect(setPlanListedAction(id, false)).rejects.toThrow();
    expect((await getPlan(id))!.listed).toBe(true);
  });

  it("an admin's reorder with a stale list is refused with a message, not saved", async () => {
    requireAdmin.mockResolvedValue({ id: "a", role: "admin" });
    const before = (await listBoards()).map((b) => b.id);
    expect(await reorderBoardsAction(before.slice(1))).toEqual({ error: expect.stringMatching(/doesn't match/) });
    expect((await listBoards()).map((b) => b.id)).toEqual(before);
  });
});
