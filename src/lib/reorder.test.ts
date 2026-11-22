import { beforeAll, describe, expect, it } from "vitest";
import { migrateDb } from "@/db";
import { createBoard, listBoards } from "@/lib/community/boards";
import { createCourse, createLesson, createModule, getCourseOutline } from "@/lib/courses";
import { ReorderError, reorderBoards, reorderLessons, reorderModules } from "@/lib/reorder";

beforeAll(() => migrateDb());

async function outline() {
  const course = await createCourse({ title: "C", groupIds: [] });
  const m1 = await createModule({ courseId: course.id, title: "M1" });
  const m2 = await createModule({ courseId: course.id, title: "M2" });
  const a = await createLesson({ moduleId: m1.id, title: "A" });
  const b = await createLesson({ moduleId: m1.id, title: "B" });
  const c = await createLesson({ moduleId: m1.id, title: "C" });
  const other = await createLesson({ moduleId: m2.id, title: "Other" });
  return { course, m1, m2, a, b, c, other };
}

const lessonOrder = async (courseId: string, moduleId: string) =>
  (await getCourseOutline(courseId))!.modules.find((m) => m.id === moduleId)!.lessons.map((l) => l.title);

describe("reorder lessons (AC-28, AC-29)", () => {
  it("saves the new order", async () => {
    const o = await outline();
    await reorderLessons(o.m1.id, [o.c.id, o.a.id, o.b.id]);
    expect(await lessonOrder(o.course.id, o.m1.id)).toEqual(["C", "A", "B"]);
  });

  it("refuses ids from another module, missing ids, duplicates or unknown ids, and leaves the order alone", async () => {
    const o = await outline();
    const bad = [
      [o.a.id, o.b.id, o.other.id],
      [o.a.id, o.b.id],
      [o.a.id, o.a.id, o.b.id],
      [o.a.id, o.b.id, o.c.id, "nope"],
    ];
    for (const ids of bad) await expect(reorderLessons(o.m1.id, ids)).rejects.toBeInstanceOf(ReorderError);
    expect(await lessonOrder(o.course.id, o.m1.id)).toEqual(["A", "B", "C"]);
  });
});

describe("reorder modules (AC-28, AC-29)", () => {
  it("saves the new order and refuses another course's modules", async () => {
    const o = await outline();
    const elsewhere = await outline();
    await expect(reorderModules(o.course.id, [o.m2.id, elsewhere.m1.id])).rejects.toBeInstanceOf(ReorderError);
    await reorderModules(o.course.id, [o.m2.id, o.m1.id]);
    expect((await getCourseOutline(o.course.id))!.modules.map((m) => m.title)).toEqual(["M2", "M1"]);
  });
});

describe("reorder boards (AC-28, AC-29)", () => {
  it("saves the new order and refuses a partial list", async () => {
    const existing = (await listBoards()).map((b) => b.id);
    const x = await createBoard({ name: "X board", groupIds: [] });
    const y = await createBoard({ name: "Y board", groupIds: [] });
    await expect(reorderBoards([y.id])).rejects.toBeInstanceOf(ReorderError);
    await reorderBoards([y.id, ...existing, x.id]);
    expect((await listBoards()).map((b) => b.id)).toEqual([y.id, ...existing, x.id]);
  });
});
