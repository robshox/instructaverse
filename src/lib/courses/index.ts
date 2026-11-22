import { and, asc, eq, inArray, max } from "drizzle-orm";
import { db } from "@/db";
import { courseGroups, courses, lessons, modules } from "@/db/schema";
import { canAccess, type Viewer } from "@/lib/access";
import { listPlans, type Plan } from "@/lib/plans";

export type Course = typeof courses.$inferSelect & { groupIds: string[] };
export type Lesson = typeof lessons.$inferSelect;

// ---- writes (the admin editor and the API build on these) ----

export async function createCourse(input: {
  title: string;
  description?: string;
  groupIds: string[];
  externalId?: string | null;
}): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  const [{ last } = { last: null }] = await db.select({ last: max(courses.position) }).from(courses);
  db.transaction((tx) => {
    tx.insert(courses)
      .values({
        id,
        title: input.title,
        description: input.description ?? "",
        position: (last ?? -1) + 1,
        externalId: input.externalId ?? null,
      })
      .run();
    if (input.groupIds.length) tx.insert(courseGroups).values(input.groupIds.map((groupId) => ({ courseId: id, groupId }))).run();
  });
  return { id };
}

export async function createModule(input: { courseId: string; title: string; externalId?: string | null }) {
  const [{ last } = { last: null }] = await db
    .select({ last: max(modules.position) })
    .from(modules)
    .where(eq(modules.courseId, input.courseId));
  const [row] = await db
    .insert(modules)
    .values({ id: crypto.randomUUID(), ...input, position: (last ?? -1) + 1 })
    .returning();
  return row!;
}

export async function createLesson(input: {
  moduleId: string;
  title: string;
  bodyMd?: string;
  transcript?: string | null;
  externalId?: string | null;
}) {
  const [{ last } = { last: null }] = await db
    .select({ last: max(lessons.position) })
    .from(lessons)
    .where(eq(lessons.moduleId, input.moduleId));
  const [row] = await db
    .insert(lessons)
    .values({ id: crypto.randomUUID(), ...input, position: (last ?? -1) + 1 })
    .returning();
  return row!;
}

// ---- reads ----

async function withGroups(rows: (typeof courses.$inferSelect)[]): Promise<Course[]> {
  if (!rows.length) return [];
  const links = await db
    .select()
    .from(courseGroups)
    .where(inArray(courseGroups.courseId, rows.map((r) => r.id)));
  return rows.map((r) => ({ ...r, groupIds: links.filter((l) => l.courseId === r.id).map((l) => l.groupId) }));
}

export async function getCourse(id: string): Promise<Course | null> {
  return (await withGroups(await db.select().from(courses).where(eq(courses.id, id))))[0] ?? null;
}

/** Courses this viewer can open, for navigation (AC-16). */
export async function listCoursesFor(viewer: Viewer): Promise<Course[]> {
  const all = await withGroups(await db.select().from(courses).orderBy(asc(courses.position), asc(courses.title)));
  const visible = await Promise.all(all.map((c) => canAccess(viewer, c.groupIds)));
  return all.filter((_, i) => visible[i]);
}

export async function getCourseOutline(courseId: string) {
  const course = await getCourse(courseId);
  if (!course) return null;
  const mods = await db.select().from(modules).where(eq(modules.courseId, courseId)).orderBy(asc(modules.position));
  const ls = mods.length
    ? await db
        .select({ id: lessons.id, moduleId: lessons.moduleId, title: lessons.title, position: lessons.position, muxStatus: lessons.muxStatus })
        .from(lessons)
        .where(inArray(lessons.moduleId, mods.map((m) => m.id)))
        .orderBy(asc(lessons.position))
    : [];
  return { course, modules: mods.map((m) => ({ ...m, lessons: ls.filter((l) => l.moduleId === m.id) })) };
}

/** Listed plans that would give access to something gated to `groupIds`. */
export async function plansGranting(groupIds: string[]): Promise<Plan[]> {
  if (!groupIds.length) return [];
  return (await listPlans({ listedOnly: true })).filter((p) => p.groupIds.some((g) => groupIds.includes(g)));
}

export type LessonResult =
  | { status: "ok"; course: Course; lesson: Lesson }
  | { status: "no-access"; courseTitle: string; plans: Plan[] }
  | { status: "not-found" };

/** A lesson opened by URL: the lesson, a no-access result with plans that grant it, or not found. */
export async function getLessonForViewer(viewer: Viewer, courseId: string, lessonId: string): Promise<LessonResult> {
  const [row] = await db
    .select({ lesson: lessons })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(and(eq(lessons.id, lessonId), eq(modules.courseId, courseId)));
  const course = row ? await getCourse(courseId) : null;
  if (!row || !course) return { status: "not-found" };
  if (!(await canAccess(viewer, course.groupIds))) {
    return { status: "no-access", courseTitle: course.title, plans: await plansGranting(course.groupIds) };
  }
  return { status: "ok", course, lesson: row.lesson };
}

/** A lesson by ID and whether this viewer may see it (for media routes). */
export async function lessonWithAccess(viewer: Viewer, lessonId: string): Promise<{ lesson: Lesson; allowed: boolean } | null> {
  const [row] = await db
    .select({ lesson: lessons, courseId: modules.courseId })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(eq(lessons.id, lessonId));
  if (!row) return null;
  const course = await getCourse(row.courseId);
  return { lesson: row.lesson, allowed: Boolean(course) && (await canAccess(viewer, course!.groupIds)) };
}
