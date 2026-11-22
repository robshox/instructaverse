import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { lessons } from "@/db/schema";
import { Field, inputClass } from "@/components/form";
import { requireAdmin } from "@/lib/session";
import { attachAssetAction, saveLessonAction, startUploadAction } from "../../../actions";
import { EditorForm, VideoUpload } from "../../../forms";

const videoStatus: Record<string, string> = {
  preparing: "Processing in Mux…",
  ready: "Ready",
  errored: "Mux couldn't process this video. Try uploading it again.",
};

export default async function LessonEditorPage({ params }: PageProps<"/admin/courses/[courseId]/lessons/[lessonId]">) {
  await requireAdmin();
  const { courseId, lessonId } = await params;
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
  if (!lesson) notFound();

  return (
    <main className="flex max-w-2xl flex-col gap-10">
      <div className="flex items-baseline justify-between">
        <Link href={`/admin/courses/${courseId}`} className="text-sm underline-offset-4 hover:underline">
          ← Course
        </Link>
        <Link href={`/courses/${courseId}/${lesson.id}`} className="text-sm underline">
          View as member
        </Link>
      </div>

      <EditorForm action={saveLessonAction} submit="Save lesson">
        <input type="hidden" name="id" value={lesson.id} />
        <Field label="Title" name="title" defaultValue={lesson.title} required />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Lesson text (Markdown)
          <textarea name="bodyMd" defaultValue={lesson.bodyMd} rows={8} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Transcript
          <textarea name="transcript" defaultValue={lesson.transcript ?? ""} rows={6} className={`${inputClass} font-mono text-xs`} />
          <span className="font-normal text-zinc-500">Plain text, or WebVTT (starting with WEBVTT) to also show it as captions.</span>
        </label>
      </EditorForm>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Video</h2>
        <p className="text-sm">
          Status: <span className="font-medium">{lesson.muxStatus ? videoStatus[lesson.muxStatus] ?? lesson.muxStatus : "No video"}</span>
          {lesson.muxAssetId ? <span className="text-zinc-500"> · asset {lesson.muxAssetId}</span> : null}
        </p>
        <VideoUpload lessonId={lesson.id} start={startUploadAction} />
        <EditorForm action={attachAssetAction} submit="Attach asset" className="flex items-end gap-2">
          <input type="hidden" name="id" value={lesson.id} />
          <Field label="…or use an existing Mux asset ID" name="assetId" />
        </EditorForm>
      </section>
    </main>
  );
}
