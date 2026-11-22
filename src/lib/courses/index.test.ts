import { beforeAll, describe, expect, it } from "vitest";
import { db, migrateDb } from "@/db";
import { user } from "@/db/schema";
import { createGroup, grantMembership } from "@/lib/access";
import {
  createCourse,
  createLesson,
  createModule,
  getCourseOutline,
  getLessonForViewer,
  listCoursesFor,
} from "@/lib/courses";
import { createPlan } from "@/lib/plans";

const admin = { id: "admin", role: "admin" };
const member = { id: "m1", role: "member" };
const outsider = { id: "m2", role: "member" };

let pro: { id: string };
let proCourse: { id: string };
let draftCourse: { id: string };
let lessonId: string;

beforeAll(async () => {
  migrateDb();
  await db.insert(user).values([
    { id: "admin", name: "Admin", email: "admin@example.com", role: "admin" },
    { id: "m1", name: "Member", email: "m1@example.com", role: "member" },
    { id: "m2", name: "Outsider", email: "m2@example.com", role: "member" },
  ]);
  pro = await createGroup("Pro");
  await grantMembership({ userId: "m1", groupId: pro.id, source: "manual", sourceRef: "admin" });
  await createPlan({ name: "Monthly", description: "", type: "recurring", stripePriceIds: ["price_m"], groupIds: [pro.id], listed: true });
  await createPlan({ name: "Secret", description: "", type: "recurring", stripePriceIds: ["price_s"], groupIds: [pro.id], listed: false });

  proCourse = await createCourse({ title: "AI Agents 101", description: "Build agents", groupIds: [pro.id] });
  draftCourse = await createCourse({ title: "Draft course", description: "", groupIds: [] });
  const m1 = await createModule({ courseId: proCourse.id, title: "Getting started" });
  await createModule({ courseId: proCourse.id, title: "Going deeper" });
  lessonId = (await createLesson({ moduleId: m1.id, title: "Welcome", bodyMd: "Hello **there**", transcript: "Hi everyone" })).id;
  await createLesson({ moduleId: m1.id, title: "Setup" });
});

describe("course navigation (AC-16, AC-17)", () => {
  it("members only see courses they have access to", async () => {
    expect((await listCoursesFor(member)).map((c) => c.title)).toEqual(["AI Agents 101"]);
    expect(await listCoursesFor(outsider)).toEqual([]);
  });

  it("courses with no groups are admin-only; admins see everything", async () => {
    expect((await listCoursesFor(admin)).map((c) => c.title)).toEqual(["AI Agents 101", "Draft course"]);
  });

  it("returns the outline in order", async () => {
    const outline = await getCourseOutline(proCourse.id);
    expect(outline?.modules.map((m) => [m.title, m.lessons.map((l) => l.title)])).toEqual([
      ["Getting started", ["Welcome", "Setup"]],
      ["Going deeper", []],
    ]);
  });
});

describe("lesson access by direct URL (AC-16)", () => {
  it("members with access get the lesson", async () => {
    const result = await getLessonForViewer(member, proCourse.id, lessonId);
    expect(result).toMatchObject({ status: "ok", lesson: { title: "Welcome", bodyMd: "Hello **there**", transcript: "Hi everyone" } });
  });

  it("members without access get no-access with the listed plans that would grant it", async () => {
    const result = await getLessonForViewer(outsider, proCourse.id, lessonId);
    expect(result.status).toBe("no-access");
    if (result.status === "no-access") expect(result.plans.map((p) => p.name)).toEqual(["Monthly"]);
  });

  it("signed-out visitors get no-access too", async () => {
    expect((await getLessonForViewer(null, proCourse.id, lessonId)).status).toBe("no-access");
  });

  it("an admin-only course offers no plans", async () => {
    const m = await createModule({ courseId: draftCourse.id, title: "M" });
    const l = await createLesson({ moduleId: m.id, title: "Draft lesson" });
    const result = await getLessonForViewer(member, draftCourse.id, l.id);
    expect(result).toEqual({ status: "no-access", plans: [], courseTitle: "Draft course" });
  });

  it("a lesson from another course (or a missing one) is not found", async () => {
    expect((await getLessonForViewer(admin, draftCourse.id, lessonId)).status).toBe("not-found");
    expect((await getLessonForViewer(admin, proCourse.id, "nope")).status).toBe("not-found");
  });
});
