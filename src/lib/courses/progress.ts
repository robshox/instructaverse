import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { lessonCompletions, lessons, modules } from "@/db/schema";
import type { Viewer } from "@/lib/access";
import { listCoursesFor, lessonWithAccess, type Course } from "@/lib/courses";

export class NoLessonAccessError extends Error {}

/** Mark a lesson complete or incomplete for the viewer (AC-20). Only for lessons they can see. */
export async function setLessonComplete(viewer: Viewer, lessonId: string, complete: boolean): Promise<void> {
  const found = await lessonWithAccess(viewer, lessonId);
  if (!viewer || !found?.allowed) throw new NoLessonAccessError("You can't access this lesson");
  if (complete) {
    await db.insert(lessonCompletions).values({ userId: viewer.id, lessonId }).onConflictDoNothing();
  } else {
    await db
      .delete(lessonCompletions)
      .where(and(eq(lessonCompletions.userId, viewer.id), eq(lessonCompletions.lessonId, lessonId)));
  }
}

export async function completedLessonIds(userId: string, courseId: string): Promise<string[]> {
  const rows = await db
    .select({ id: lessonCompletions.lessonId })
    .from(lessonCompletions)
    .innerJoin(lessons, eq(lessons.id, lessonCompletions.lessonId))
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(and(eq(lessonCompletions.userId, userId), eq(modules.courseId, courseId)));
  return rows.map((r) => r.id);
}

export async function courseProgress(userId: string, courseId: string): Promise<{ completed: number; total: number }> {
  const [[total], completed] = await Promise.all([
    db
      .select({ n: count() })
      .from(lessons)
      .innerJoin(modules, eq(modules.id, lessons.moduleId))
      .where(eq(modules.courseId, courseId)),
    completedLessonIds(userId, courseId),
  ]);
  return { completed: completed.length, total: total?.n ?? 0 };
}

// ---- learning overview (redesign FR-4, FR-5) ----

export type OutlineLesson = {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  moduleTitle: string;
  /** 1-based positions, as shown to members ("Module 02 · Lesson 3"). */
  moduleNumber: number;
  lessonNumber: number;
};

/** Lessons of these courses in outline order (module position, then lesson position), numbered per course. */
async function outline(courseIds: string[]): Promise<OutlineLesson[]> {
  if (!courseIds.length) return [];
  const [mods, rows] = await Promise.all([
    db
      .select({ id: modules.id, courseId: modules.courseId })
      .from(modules)
      .where(inArray(modules.courseId, courseIds))
      .orderBy(asc(modules.position)),
    db
      .select({
        courseId: modules.courseId,
        lessonId: lessons.id,
        lessonTitle: lessons.title,
        moduleId: modules.id,
        moduleTitle: modules.title,
      })
      .from(lessons)
      .innerJoin(modules, eq(modules.id, lessons.moduleId))
      .where(inArray(modules.courseId, courseIds))
      .orderBy(asc(modules.position), asc(lessons.position)),
  ]);
  const moduleNumber = new Map<string, number>();
  const perCourse = new Map<string, number>();
  for (const m of mods) {
    const n = (perCourse.get(m.courseId) ?? 0) + 1;
    perCourse.set(m.courseId, n);
    moduleNumber.set(m.id, n);
  }
  const lessonNumber = new Map<string, number>();
  return rows.map((r) => {
    const n = (lessonNumber.get(r.moduleId) ?? 0) + 1;
    lessonNumber.set(r.moduleId, n);
    return { ...r, moduleNumber: moduleNumber.get(r.moduleId)!, lessonNumber: n };
  });
}

async function completions(userId: string, lessonIds: string[]) {
  if (!lessonIds.length) return new Map<string, Date>();
  const rows = await db
    .select({ lessonId: lessonCompletions.lessonId, at: lessonCompletions.completedAt })
    .from(lessonCompletions)
    .where(and(eq(lessonCompletions.userId, userId), inArray(lessonCompletions.lessonId, lessonIds)));
  return new Map(rows.map((r) => [r.lessonId, r.at]));
}

export type CourseSummary = { course: Course; moduleCount: number; lessonCount: number; completed: number; percent: number };

/** Progress across the courses this member can see (AC-8, AC-11). */
export async function learningSummary(viewer: Viewer): Promise<{ totals: { completed: number; total: number }; courses: CourseSummary[] }> {
  if (!viewer) return { totals: { completed: 0, total: 0 }, courses: [] };
  const visible = await listCoursesFor(viewer);
  const ids = visible.map((c) => c.id);
  const [lessonsInOrder, moduleRows] = await Promise.all([
    outline(ids),
    ids.length ? db.select({ courseId: modules.courseId }).from(modules).where(inArray(modules.courseId, ids)) : Promise.resolve([]),
  ]);
  const done = await completions(viewer.id, lessonsInOrder.map((l) => l.lessonId));
  const courses = visible.map((course) => {
    const own = lessonsInOrder.filter((l) => l.courseId === course.id);
    const completed = own.filter((l) => done.has(l.lessonId)).length;
    return {
      course,
      moduleCount: moduleRows.filter((m) => m.courseId === course.id).length,
      lessonCount: own.length,
      completed,
      percent: own.length ? Math.round((completed / own.length) * 100) : 0,
    };
  });
  return {
    totals: { completed: courses.reduce((n, c) => n + c.completed, 0), total: courses.reduce((n, c) => n + c.lessonCount, 0) },
    courses,
  };
}

/**
 * Where to continue (AC-9, AC-10): the first incomplete lesson, in outline order, of the course
 * the member most recently completed a lesson in. If that course is finished (or nothing has been
 * completed yet), the first course, in course order, with a lesson left. Null when there's nothing left.
 * With `courseId`, only that course is considered (null if it's finished, empty or not visible).
 */
export async function nextIncompleteLesson(viewer: Viewer, courseId?: string): Promise<OutlineLesson | null> {
  if (!viewer) return null;
  const visible = (await listCoursesFor(viewer)).map((c) => c.id);
  const ids = courseId ? visible.filter((id) => id === courseId) : visible;
  const lessonsInOrder = await outline(ids);
  const done = await completions(viewer.id, lessonsInOrder.map((l) => l.lessonId));
  const firstOpen = (cid: string) => lessonsInOrder.find((l) => l.courseId === cid && !done.has(l.lessonId)) ?? null;
  if (courseId) return ids.length ? firstOpen(courseId) : null;

  let recentCourse: string | null = null;
  let recentAt = -Infinity;
  for (const l of lessonsInOrder) {
    const at = done.get(l.lessonId)?.getTime();
    if (at !== undefined && at > recentAt) {
      recentAt = at;
      recentCourse = l.courseId;
    }
  }
  const recent = recentCourse ? firstOpen(recentCourse) : null;
  if (recent) return recent;
  for (const id of ids) {
    const open = firstOpen(id);
    if (open) return open;
  }
  return null;
}

/** Completed / total per module of a course, in module order (AC-13). */
export async function moduleProgress(userId: string, courseId: string): Promise<Map<string, { completed: number; total: number }>> {
  const [mods, lessonsInOrder] = await Promise.all([
    db.select({ id: modules.id }).from(modules).where(eq(modules.courseId, courseId)).orderBy(asc(modules.position)),
    outline([courseId]),
  ]);
  const done = await completions(userId, lessonsInOrder.map((l) => l.lessonId));
  const result = new Map(mods.map((m) => [m.id, { completed: 0, total: 0 }]));
  for (const l of lessonsInOrder) {
    const entry = result.get(l.moduleId)!;
    entry.total += 1;
    if (done.has(l.lessonId)) entry.completed += 1;
  }
  return result;
}
