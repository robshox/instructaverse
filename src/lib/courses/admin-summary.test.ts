import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db, migrateDb } from "@/db";
import { lessons } from "@/db/schema";
import { courseAdminSummaries, videoStatus } from "@/lib/courses/admin-summary";
import { createCourse, createLesson, createModule } from "@/lib/courses";

beforeAll(() => migrateDb());

describe("video status (AC-27)", () => {
  it("maps the Mux state to ready, processing, error or none", () => {
    expect(videoStatus("ready")).toBe("ready");
    expect(videoStatus("preparing")).toBe("processing");
    expect(videoStatus("errored")).toBe("error");
    expect(videoStatus(null)).toBe("none");
  });
});

describe("admin course summaries (AC-27)", () => {
  it("counts modules, lessons and videos by status per course", async () => {
    const c = await createCourse({ title: "Summary course", groupIds: [] });
    const empty = await createCourse({ title: "Empty course", groupIds: [] });
    const m1 = await createModule({ courseId: c.id, title: "M1" });
    await createModule({ courseId: c.id, title: "M2" });
    const states = ["ready", "ready", "preparing", "errored", null];
    for (const [i, s] of states.entries()) {
      const l = await createLesson({ moduleId: m1.id, title: `L${i}` });
      await db.update(lessons).set({ muxStatus: s }).where(eq(lessons.id, l.id));
    }
    const summaries = await courseAdminSummaries();
    expect(summaries.get(c.id)).toEqual({ moduleCount: 2, lessonCount: 5, videos: { ready: 2, processing: 1, error: 1, none: 1 } });
    expect(summaries.get(empty.id)).toEqual({ moduleCount: 0, lessonCount: 0, videos: { ready: 0, processing: 0, error: 0, none: 0 } });
  });
});
