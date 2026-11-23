import { db } from "@/db";
import { courses, lessons, modules } from "@/db/schema";

// Admin course table and editor summaries (FR-9.1, FR-9.2, AC-27).

export type VideoStatus = "ready" | "processing" | "error" | "none";
export type VideoCounts = Record<VideoStatus, number>;
export type CourseAdminSummary = { moduleCount: number; lessonCount: number; videos: VideoCounts };

export function videoStatus(muxStatus: string | null | undefined): VideoStatus {
  if (muxStatus === "ready") return "ready";
  if (muxStatus === "preparing") return "processing";
  if (muxStatus === "errored") return "error";
  return "none";
}

export async function courseAdminSummaries(): Promise<Map<string, CourseAdminSummary>> {
  const [allCourses, allModules, allLessons] = await Promise.all([
    db.select({ id: courses.id }).from(courses),
    db.select({ id: modules.id, courseId: modules.courseId }).from(modules),
    db.select({ moduleId: lessons.moduleId, muxStatus: lessons.muxStatus }).from(lessons),
  ]);
  const result = new Map<string, CourseAdminSummary>(
    allCourses.map((c) => [c.id, { moduleCount: 0, lessonCount: 0, videos: { ready: 0, processing: 0, error: 0, none: 0 } }]),
  );
  const courseOf = new Map(allModules.map((m) => [m.id, m.courseId]));
  for (const m of allModules) result.get(m.courseId)!.moduleCount += 1;
  for (const l of allLessons) {
    const summary = result.get(courseOf.get(l.moduleId)!);
    if (!summary) continue;
    summary.lessonCount += 1;
    summary.videos[videoStatus(l.muxStatus)] += 1;
  }
  return result;
}
