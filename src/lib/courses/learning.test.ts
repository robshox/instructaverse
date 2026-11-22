import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, migrateDb } from "@/db";
import { lessonCompletions, user } from "@/db/schema";
import { createGroup, grantMembership } from "@/lib/access";
import { createCourse, createLesson, createModule } from "@/lib/courses";
import { learningSummary, moduleProgress, nextIncompleteLesson } from "@/lib/courses/progress";

const member = { id: "m1", role: "member" };
let agents: string, factory: string, hidden: string, empty: string;
const L: Record<string, string> = {};

async function complete(lessonKey: string, at: number) {
  await db.insert(lessonCompletions).values({ userId: "m1", lessonId: L[lessonKey]!, completedAt: new Date(at) });
}

beforeAll(async () => {
  migrateDb();
  await db.insert(user).values({ id: "m1", name: "Ada Lin", email: "m1@example.com", role: "member" });
  const pro = await createGroup("Pro");
  const vip = await createGroup("VIP");
  await grantMembership({ userId: "m1", groupId: pro.id, source: "manual", sourceRef: "admin" });

  agents = (await createCourse({ title: "Agents", groupIds: [pro.id] })).id;
  const a1 = await createModule({ courseId: agents, title: "Start" });
  const a2 = await createModule({ courseId: agents, title: "Tools" });
  L.a11 = (await createLesson({ moduleId: a1.id, title: "Welcome" })).id;
  L.a12 = (await createLesson({ moduleId: a1.id, title: "Setup" })).id;
  L.a21 = (await createLesson({ moduleId: a2.id, title: "First tool" })).id;

  factory = (await createCourse({ title: "Factory", groupIds: [pro.id] })).id;
  const f1 = await createModule({ courseId: factory, title: "Week 1" });
  L.f11 = (await createLesson({ moduleId: f1.id, title: "Pipeline" })).id;
  L.f12 = (await createLesson({ moduleId: f1.id, title: "Checks" })).id;

  hidden = (await createCourse({ title: "VIP only", groupIds: [vip.id] })).id;
  L.h11 = (await createLesson({ moduleId: (await createModule({ courseId: hidden, title: "M" })).id, title: "Secret" })).id;

  empty = (await createCourse({ title: "Empty", groupIds: [pro.id] })).id;
});

beforeEach(async () => {
  await db.delete(lessonCompletions).where(eq(lessonCompletions.userId, "m1"));
});

describe("learning summary (AC-8, AC-11)", () => {
  it("totals only the member's accessible courses", async () => {
    await complete("a11", 1000);
    await complete("f11", 2000);
    const s = await learningSummary(member);
    expect(s.totals).toEqual({ completed: 2, total: 5 }); // agents 3 + factory 2 + empty 0; VIP excluded
    expect(s.courses.map((c) => [c.course.title, c.moduleCount, c.lessonCount, c.completed, c.percent])).toEqual([
      ["Agents", 2, 3, 1, 33],
      ["Factory", 1, 2, 1, 50],
      ["Empty", 0, 0, 0, 0],
    ]);
  });
});

describe("next incomplete lesson (AC-9, AC-10, AC-13)", () => {
  it("with no completions, starts at the first lesson of the first course", async () => {
    expect(await nextIncompleteLesson(member)).toMatchObject({ courseId: agents, lessonId: L.a11, moduleNumber: 1, lessonNumber: 1 });
  });

  it("continues in the course most recently progressed, in outline order, crossing modules", async () => {
    await complete("a11", 1000);
    await complete("f11", 3000);
    expect(await nextIncompleteLesson(member)).toMatchObject({ courseId: factory, lessonId: L.f12 });
    await complete("a12", 4000);
    expect(await nextIncompleteLesson(member)).toMatchObject({ courseId: agents, lessonId: L.a21, moduleNumber: 2, lessonNumber: 1 });
  });

  it("if the most recent course is finished, moves on to the first course with lessons left", async () => {
    await complete("f11", 1000);
    await complete("f12", 2000);
    expect(await nextIncompleteLesson(member)).toMatchObject({ courseId: agents, lessonId: L.a11 });
  });

  it("returns null when every accessible lesson is complete", async () => {
    for (const [k, t] of [["a11", 1], ["a12", 2], ["a21", 3], ["f11", 4], ["f12", 5]] as const) await complete(k, t);
    expect(await nextIncompleteLesson(member)).toBeNull();
  });

  it("per course: the first incomplete lesson, or null for an empty or finished course", async () => {
    await complete("a11", 1000);
    expect(await nextIncompleteLesson(member, agents)).toMatchObject({ lessonId: L.a12, lessonTitle: "Setup", moduleTitle: "Start" });
    expect(await nextIncompleteLesson(member, empty)).toBeNull();
    expect(await nextIncompleteLesson(member, hidden)).toBeNull(); // no access
  });
});

describe("module progress (AC-13)", () => {
  it("counts completed / total per module", async () => {
    await complete("a11", 1000);
    const progress = await moduleProgress("m1", agents);
    expect([...progress.values()]).toEqual([
      { completed: 1, total: 2 },
      { completed: 0, total: 1 },
    ]);
  });
});
