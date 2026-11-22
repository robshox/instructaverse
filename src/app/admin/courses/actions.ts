"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createCourse, createLesson, createModule } from "@/lib/courses";
import {
  attachMuxAsset,
  CourseInputError,
  createLessonUpload,
  deleteCourse,
  deleteLesson,
  deleteModule,
  moveLesson,
  moveModule,
  updateCourse,
  updateLesson,
  updateModule,
} from "@/lib/courses/admin";
import { requireAdmin } from "@/lib/session";

export type EditorState = { error?: string; ok?: number };

const str = (f: FormData, k: string) => String(f.get(k) ?? "");

async function attempt(work: () => Promise<unknown>): Promise<EditorState> {
  try {
    await work();
  } catch (e) {
    if (e instanceof CourseInputError) return { error: e.message };
    throw e;
  }
  refresh();
  return { ok: Date.now() };
}

export async function createCourseAction(_p: EditorState, f: FormData): Promise<EditorState> {
  await requireAdmin();
  const title = str(f, "title").trim();
  if (!title) return { error: "Enter a course title" };
  const { id } = await createCourse({ title, groupIds: [] });
  redirect(`/admin/courses/${id}`);
}

export async function saveCourseAction(_p: EditorState, f: FormData): Promise<EditorState> {
  await requireAdmin();
  return attempt(() =>
    updateCourse(str(f, "id"), { title: str(f, "title"), description: str(f, "description"), groupIds: f.getAll("groupIds").map(String) }),
  );
}

export async function deleteCourseAction(f: FormData) {
  await requireAdmin();
  if (f.get("confirm") !== "yes") return;
  await deleteCourse(str(f, "id"));
  redirect("/admin/courses");
}

export async function addModuleAction(_p: EditorState, f: FormData): Promise<EditorState> {
  await requireAdmin();
  const title = str(f, "title").trim();
  if (!title) return { error: "Enter a module title" };
  return attempt(() => createModule({ courseId: str(f, "courseId"), title }));
}

export async function renameModuleAction(_p: EditorState, f: FormData): Promise<EditorState> {
  await requireAdmin();
  return attempt(() => updateModule(str(f, "id"), { title: str(f, "title") }));
}

export async function addLessonAction(_p: EditorState, f: FormData): Promise<EditorState> {
  await requireAdmin();
  const title = str(f, "title").trim();
  if (!title) return { error: "Enter a lesson title" };
  return attempt(() => createLesson({ moduleId: str(f, "moduleId"), title }));
}

/** Move/delete buttons: the button's name/value says what to do. */
export async function outlineAction(f: FormData) {
  await requireAdmin();
  const [kind, op, id] = str(f, "do").split(":");
  if (!id) return;
  if (kind === "module" && (op === "up" || op === "down")) await moveModule(id, op);
  if (kind === "lesson" && (op === "up" || op === "down")) await moveLesson(id, op);
  if (kind === "module" && op === "delete" && f.get(`confirm-${id}`) === "yes") await deleteModule(id);
  if (kind === "lesson" && op === "delete" && f.get(`confirm-${id}`) === "yes") await deleteLesson(id);
  refresh();
}

export async function saveLessonAction(_p: EditorState, f: FormData): Promise<EditorState> {
  await requireAdmin();
  return attempt(() => updateLesson(str(f, "id"), { title: str(f, "title"), bodyMd: str(f, "bodyMd"), transcript: str(f, "transcript") }));
}

export async function startUploadAction(lessonId: string): Promise<{ uploadUrl?: string; error?: string }> {
  await requireAdmin();
  try {
    return await createLessonUpload(lessonId);
  } catch (e) {
    console.error("[mux] couldn't create upload", e);
    return { error: "Couldn't start the upload. Check the Mux settings." };
  }
}

export async function attachAssetAction(_p: EditorState, f: FormData): Promise<EditorState> {
  await requireAdmin();
  const assetId = str(f, "assetId").trim();
  if (!assetId) return { error: "Enter a Mux asset ID" };
  try {
    return await attempt(() => attachMuxAsset(str(f, "id"), assetId));
  } catch (e) {
    console.error("[mux] couldn't attach asset", e);
    return { error: "Couldn't find that asset in Mux." };
  }
}
