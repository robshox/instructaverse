import { beforeAll, describe, expect, it } from "vitest";
import { db, migrateDb } from "@/db";
import { user } from "@/db/schema";
import { createGroup, grantMembership } from "@/lib/access";
import { createCourse, createLesson, createModule } from "@/lib/courses";
import { completedLessonIds, courseProgress, NoLessonAccessError, setLessonComplete } from "@/lib/courses/progress";

const member = { id: "m1", role: "member" };
const outsider = { id: "m2", role: "member" };
let courseId: string;
let otherCourseId: string;
let l1: string, l2: string, l3: string, otherLesson: string;

beforeAll(async () => {
  migrateDb();
  await db.insert(user).values([
    { id: "m1", name: "M", email: "m1@example.com", role: "member" },
    { id: "m2", name: "O", email: "m2@example.com", role: "member" },
  ]);
  const pro = await createGroup("Pro");
  await grantMembership({ userId: "m1", groupId: pro.id, source: "manual", sourceRef: "admin" });
  courseId = (await createCourse({ title: "C", groupIds: [pro.id] })).id;
  const a = await createModule({ courseId, title: "A" });
  const b = await createModule({ courseId, title: "B" });
  l1 = (await createLesson({ moduleId: a.id, title: "1" })).id;
  l2 = (await createLesson({ moduleId: a.id, title: "2" })).id;
  l3 = (await createLesson({ moduleId: b.id, title: "3" })).id;
  otherCourseId = (await createCourse({ title: "Other", groupIds: [pro.id] })).id;
  otherLesson = (await createLesson({ moduleId: (await createModule({ courseId: otherCourseId, title: "X" })).id, title: "x" })).id;
});

describe("lesson completion and progress (AC-20)", () => {
  it("starts at zero", async () => {
    expect(await courseProgress("m1", courseId)).toEqual({ completed: 0, total: 3 });
  });

  it("marking lessons complete updates the course's completed / total", async () => {
    await setLessonComplete(member, l1, true);
    await setLessonComplete(member, l3, true);
    expect(await courseProgress("m1", courseId)).toEqual({ completed: 2, total: 3 });
    expect((await completedLessonIds("m1", courseId)).sort()).toEqual([l1, l3].sort());
  });

  it("marking complete twice counts once; marking incomplete removes it", async () => {
    await setLessonComplete(member, l1, true);
    expect(await courseProgress("m1", courseId)).toEqual({ completed: 2, total: 3 });
    await setLessonComplete(member, l3, false);
    expect(await courseProgress("m1", courseId)).toEqual({ completed: 1, total: 3 });
  });

  it("progress is per member and per course", async () => {
    await setLessonComplete(member, otherLesson, true);
    expect(await courseProgress("m1", courseId)).toEqual({ completed: 1, total: 3 });
    expect(await courseProgress("m1", otherCourseId)).toEqual({ completed: 1, total: 1 });
    expect(await courseProgress("m2", courseId)).toEqual({ completed: 0, total: 3 });
  });

  it("persists (stored, not session state)", async () => {
    await setLessonComplete(member, l2, true);
    // A fresh read, as on a later visit, sees the same state.
    expect((await completedLessonIds("m1", courseId)).sort()).toEqual([l1, l2].sort());
  });

  it("members can't record progress on lessons they can't see", async () => {
    await expect(setLessonComplete(outsider, l1, true)).rejects.toBeInstanceOf(NoLessonAccessError);
    await expect(setLessonComplete(member, "missing", true)).rejects.toBeInstanceOf(NoLessonAccessError);
  });
});
