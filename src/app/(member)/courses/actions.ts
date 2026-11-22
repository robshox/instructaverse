"use server";

import { refresh } from "next/cache";
import { NoLessonAccessError, setLessonComplete } from "@/lib/courses/progress";
import { getViewer } from "@/lib/session";

export async function toggleLessonComplete(lessonId: string, complete: boolean): Promise<{ error?: string }> {
  try {
    await setLessonComplete(await getViewer(), lessonId, complete);
  } catch (e) {
    if (e instanceof NoLessonAccessError) return { error: e.message };
    throw e;
  }
  refresh();
  return {};
}
