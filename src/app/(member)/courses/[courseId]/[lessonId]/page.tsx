import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CompleteButton } from "@/components/complete-button";
import { Icon } from "@/components/icon";
import { LessonPlayer } from "@/components/lesson-player";
import { Markdown } from "@/components/markdown";
import { NoAccess } from "@/components/no-access";
import { Eyebrow, PillLink, ProgressBar } from "@/components/ui";
import { getCourseOutline, getLessonForViewer } from "@/lib/courses";
import { lessonPosition } from "@/lib/courses/lesson-view";
import { completedLessonIds } from "@/lib/courses/progress";
import { isVtt, playbackFor } from "@/lib/mux";
import { vttCues } from "@/lib/mux/vtt";
import { getViewer } from "@/lib/session";

type Props = PageProps<"/courses/[courseId]/[lessonId]">;

export default function LessonPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <Lesson params={params} />
    </Suspense>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Lesson page (FR-5.3, FR-5.4, AC-14 to AC-17). */
async function Lesson({ params }: Pick<Props, "params">) {
  const { courseId, lessonId } = await params;
  const viewer = await getViewer();
  const result = await getLessonForViewer(viewer, courseId, lessonId);
  if (result.status === "not-found") notFound();
  if (result.status === "no-access") {
    return <NoAccess title={result.courseTitle} plans={result.plans} signedIn={Boolean(viewer)} />;
  }
  const { course, lesson } = result;
  const [playback, doneIds, outline] = await Promise.all([
    playbackFor(viewer, lesson.id),
    viewer ? completedLessonIds(viewer.id, course.id) : Promise.resolve([]),
    getCourseOutline(course.id),
  ]);
  const modules = outline?.modules ?? [];
  const done = new Set(doneIds);
  const total = modules.reduce((n, m) => n + m.lessons.length, 0);
  const position = lessonPosition({ modules }, lesson.id);
  const moduleSize = modules[(position?.moduleNumber ?? 1) - 1]?.lessons.length ?? 0;
  const vtt = isVtt(lesson.transcript);
  const cues = vtt ? vttCues(lesson.transcript!) : [];
  const plainTranscript = vtt ? null : lesson.transcript?.trim() || null;

  return (
    <main className="grid items-start gap-10 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <Link href={`/courses/${course.id}`} className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[.04em] text-muted hover:text-fg">
          <span className="text-accent">←</span> {course.title}
        </Link>
        {playback ? (
          <div className="mt-5">
            <LessonPlayer
              playbackId={playback.playbackId}
              tokens={playback.tokens}
              title={lesson.title}
              captionsSrc={vtt ? `/api/lessons/${lesson.id}/captions` : null}
            />
          </div>
        ) : lesson.muxStatus === "preparing" ? (
          <div
            role="status"
            className="mt-5 flex aspect-video w-full items-center justify-center rounded-md border border-line bg-[radial-gradient(90%_120%_at_75%_15%,#2b1406_0%,#111_50%,#0b0b0b_100%)] font-mono text-sm text-muted"
          >
            Video processing…
          </div>
        ) : null}

        {position ? (
          <Eyebrow accent={`Module ${pad(position.moduleNumber)}`} className="mt-7">
            Lesson {position.lessonNumber} of {moduleSize}
          </Eyebrow>
        ) : null}
        <h1 className="mt-2.5 text-[40px] leading-[1.08] font-medium tracking-[-.04em]">{lesson.title}</h1>
        <div className="mt-5 flex flex-wrap gap-3">
          {viewer ? <CompleteButton lessonId={lesson.id} complete={done.has(lesson.id)} /> : null}
          {position?.next ? (
            <PillLink href={`/courses/${course.id}/${position.next.id}`}>
              Next lesson <Icon name="arrow-right" size={16} />
            </PillLink>
          ) : null}
        </div>

        {lesson.bodyMd ? (
          <article className="mt-10 border-t border-line pt-8">
            <Markdown>{lesson.bodyMd}</Markdown>
          </article>
        ) : null}

        {cues.length || plainTranscript ? (
          <details open className="mt-8 rounded-md border border-line bg-surface px-[22px] py-5">
            <summary className="flex cursor-pointer list-none justify-between font-mono text-xs uppercase tracking-[.04em] text-muted [&::-webkit-details-marker]:hidden">
              <span>
                <b className="font-normal text-accent">Transcript</b>
                {vtt ? " · captions on" : null}
              </span>
              <Icon name="chevron-down" size={16} />
            </summary>
            {cues.length ? (
              <ol className="mt-3">
                {cues.map((c, i) => (
                  <li key={i} className="grid grid-cols-[56px_1fr] gap-3 py-2 text-sm text-[#cfcfcf]">
                    <time className="pt-0.5 font-mono text-xs text-accent">{c.start}</time>
                    <span>{c.text}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-[#cfcfcf]">{plainTranscript}</div>
            )}
          </details>
        ) : null}
      </div>

      <aside aria-label="Course outline" className="overflow-hidden rounded-md border border-line bg-surface lg:sticky lg:top-6 lg:mt-[42px]">
        <div className="border-b border-line px-4 pt-[18px] pb-3.5">
          <Eyebrow>{course.title}</Eyebrow>
          <div className="mt-2.5 flex items-center gap-2.5">
            <ProgressBar value={done.size} max={total} label="Course progress" className="flex-1" />
            <span className="font-mono text-xs text-muted">
              {done.size} / {total}
            </span>
          </div>
        </div>
        <div className="py-3">
          {modules.map((m, mi) => (
            <div key={m.id}>
              <p className={`px-4 pb-1.5 font-mono text-xs uppercase tracking-[.04em] text-muted ${mi ? "pt-3.5" : "pt-1.5"}`}>
                {pad(mi + 1)} · {m.title}
              </p>
              <ol>
                {m.lessons.map((l) => {
                  const current = l.id === lesson.id;
                  const isDone = done.has(l.id);
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/courses/${course.id}/${l.id}`}
                        aria-current={current ? "page" : undefined}
                        className={`grid grid-cols-[18px_1fr] items-center gap-2.5 px-4 py-[9px] text-sm ${
                          current ? "bg-raised text-fg shadow-[inset_2px_0_0_var(--color-accent)]" : "text-muted hover:text-fg"
                        }`}
                      >
                        {current ? (
                          <span className="text-accent">
                            <Icon name="play" size={12} label="Now playing" />
                          </span>
                        ) : isDone ? (
                          <span className="font-mono text-xs text-ok">
                            ✓<span className="sr-only"> Completed</span>
                          </span>
                        ) : (
                          <span />
                        )}
                        <span>{l.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}
