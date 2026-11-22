import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessonCompletions, lessons, modules } from "@/db/schema";
import type { Viewer } from "@/lib/access";
import { lessonWithAccess } from "@/lib/courses";

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
