import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NoAccess } from "@/components/no-access";
import { getLessonForViewer } from "@/lib/courses";
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

  return (
    <main className="flex flex-col gap-6">
      <Link href={`/courses/${course.id}`} className="text-sm underline-offset-4 hover:underline">
        ← {course.title}
      </Link>
      <h1 className="text-2xl font-semibold">{lesson.title}</h1>
      {/* Video player arrives in 3.2 (SWI-209). */}
      {lesson.bodyMd ? (
        // Plain text for now; Markdown rendering needs a dependency decision.
        <div className="whitespace-pre-wrap leading-relaxed">{lesson.bodyMd}</div>
      ) : null}
      {lesson.transcript ? (
        <details className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <summary className="cursor-pointer font-medium">Transcript</summary>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{lesson.transcript}</div>
        </details>
      ) : null}
    </main>
  );
}
