import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { lessons } from "@/db/schema";
import { Field, inputClass, labelClass } from "@/components/form";
import { Icon } from "@/components/icon";
import { Card, Eyebrow, pillClass } from "@/components/ui";
import { VideoStatusTag } from "@/components/video-status";
import { getCourseOutline } from "@/lib/courses";
import { videoStatus } from "@/lib/courses/admin-summary";
import { lessonPosition } from "@/lib/courses/lesson-view";
import { requireAdmin } from "@/lib/session";
import { attachAssetAction, saveLessonAction, startUploadAction } from "../../../actions";
import { EditorForm, VideoUpload } from "../../../forms";
import { MarkdownField, TranscriptField } from "./fields";

const statusHelp: Record<string, string> = {
  preparing: "Processing in Mux…",
  errored: "Mux couldn't process this video. Try uploading it again.",
};

/** Lesson editor (FR-9.4, AC-30). */
export default async function LessonEditorPage({ params }: PageProps<"/admin/courses/[courseId]/lessons/[lessonId]">) {
  await requireAdmin();
  const { courseId, lessonId } = await params;
  const [[lesson], outline] = await Promise.all([db.select().from(lessons).where(eq(lessons.id, lessonId)), getCourseOutline(courseId)]);
  if (!lesson) notFound();
  const position = outline ? lessonPosition(outline, lesson.id) : null;

  return (
    <main className="flex flex-col gap-6">
      <div>
        <Link href={`/admin/courses/${courseId}`} className="font-mono text-xs uppercase tracking-[.04em] text-muted hover:text-fg">
          <span className="text-accent">←</span> {outline?.course.title ?? "Course"}
          {position ? ` · Module ${String(position.moduleNumber).padStart(2, "0")}` : ""}
        </Link>
        <div className="mt-2.5 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[30px] leading-[1.15] font-medium tracking-[-.035em]">{lesson.title}</h1>
          <Link href={`/courses/${courseId}/${lesson.id}`} className={pillClass("secondary")}>
            <Icon name="eye" size={15} /> View as member
          </Link>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
        <EditorForm action={saveLessonAction} submit="Save lesson" className="flex min-w-0 flex-col gap-5">
          <input type="hidden" name="id" value={lesson.id} />
          <Card className="p-5">
            <Field label="Title" name="title" defaultValue={lesson.title} required />
          </Card>
          <MarkdownField name="bodyMd" defaultValue={lesson.bodyMd} />
          <TranscriptField name="transcript" defaultValue={lesson.transcript ?? ""} />
        </EditorForm>

        <aside className="flex flex-col gap-3.5 rounded-md border border-line bg-surface p-[18px]">
          <div className="flex items-center justify-between">
            <Eyebrow accent="Video" />
            <span className="font-mono text-[11px] text-dim">MUX</span>
          </div>
          <VideoUpload lessonId={lesson.id} start={startUploadAction} />
          <div className="flex items-center justify-between font-mono text-xs text-muted">
            <span>Status</span>
            <VideoStatusTag status={videoStatus(lesson.muxStatus)} />
          </div>
          {lesson.muxStatus && statusHelp[lesson.muxStatus] ? <p className="text-xs text-muted">{statusHelp[lesson.muxStatus]}</p> : null}
          {lesson.muxAssetId ? <p className="font-mono text-[11px] break-all text-dim">asset {lesson.muxAssetId}</p> : null}
          <div className="h-px bg-line" />
          <EditorForm action={attachAssetAction} submit="Attach asset" size="sm" className="flex flex-col items-start gap-2.5">
            <input type="hidden" name="id" value={lesson.id} />
            <label className={`${labelClass} w-full`}>
              Or use an existing Mux asset
              <input name="assetId" placeholder="asset id" className={`${inputClass} font-mono text-[13px] tracking-normal normal-case`} />
            </label>
          </EditorForm>
          <p className="font-mono text-[11px] text-dim">Assets must use signed playback.</p>
        </aside>
      </div>
    </main>
  );
}
