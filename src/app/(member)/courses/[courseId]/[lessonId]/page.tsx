import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CompleteButton } from "@/components/complete-button";
import { LessonPlayer } from "@/components/lesson-player";
import { Markdown } from "@/components/markdown";
import { NoAccess } from "@/components/no-access";
import { getLessonForViewer } from "@/lib/courses";
import { completedLessonIds } from "@/lib/courses/progress";
import { isVtt, playbackFor, vttToText } from "@/lib/mux";
import { getViewer } from "@/lib/session";

type Props = PageProps<"/courses/[courseId]/[lessonId]">;

export default function LessonPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Lesson params={params} />
    </Suspense>
  );
}

async function Lesson({ params }: Pick<Props, "params">) {
  const { courseId, lessonId } = await params;
  const viewer = await getViewer();
  const result = await getLessonForViewer(viewer, courseId, lessonId);
  if (result.status === "not-found") notFound();
  if (result.status === "no-access") {
    return <NoAccess title={result.courseTitle} plans={result.plans} signedIn={Boolean(viewer)} />;
  }
  const { course, lesson } = result;
  const [playback, done] = await Promise.all([
    playbackFor(viewer, lesson.id),
    viewer ? completedLessonIds(viewer.id, course.id) : Promise.resolve([]),
  ]);
  const vtt = isVtt(lesson.transcript);
  const transcriptText = vtt ? vttToText(lesson.transcript!) : lesson.transcript;

  return (
    <main className="flex flex-col gap-6">
      <Link href={`/courses/${course.id}`} className="text-sm underline-offset-4 hover:underline">
        ← {course.title}
      </Link>
      <h1 className="text-2xl font-semibold">{lesson.title}</h1>
      {playback ? (
        <LessonPlayer
          playbackId={playback.playbackId}
          tokens={playback.tokens}
          title={lesson.title}
          captionsSrc={vtt ? `/api/lessons/${lesson.id}/captions` : null}
        />
      ) : lesson.muxStatus === "preparing" ? (
        <div role="status" className="flex aspect-video w-full items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          Video processing…
        </div>
      ) : null}
      {lesson.bodyMd ? <Markdown>{lesson.bodyMd}</Markdown> : null}
      {transcriptText ? (
        <details className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <summary className="cursor-pointer font-medium">Transcript</summary>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{transcriptText}</div>
        </details>
      ) : null}
      {viewer ? <CompleteButton lessonId={lesson.id} complete={done.includes(lesson.id)} /> : null}
    </main>
  );
}
