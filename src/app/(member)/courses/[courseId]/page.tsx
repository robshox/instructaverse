import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { NoAccess } from "@/components/no-access";
import { Card, Eyebrow, PillLink, ProgressBar } from "@/components/ui";
import { canAccess } from "@/lib/access";
import { getCourseOutline, listCoursesFor, plansGranting } from "@/lib/courses";
import { completedLessonIds, nextIncompleteLesson } from "@/lib/courses/progress";
import { getViewer } from "@/lib/session";

export default function CoursePage({ params }: PageProps<"/courses/[courseId]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <Course params={params} />
    </Suspense>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Course outline (FR-5.1, AC-13). */
async function Course({ params }: Pick<PageProps<"/courses/[courseId]">, "params">) {
  const { courseId } = await params;
  const [outline, viewer] = await Promise.all([getCourseOutline(courseId), getViewer()]);
  if (!outline) notFound();
  const { course, modules } = outline;
  if (!(await canAccess(viewer, course.groupIds))) {
    return <NoAccess title={course.title} plans={await plansGranting(course.groupIds)} signedIn={Boolean(viewer)} />;
  }

  const [doneIds, next, mine] = viewer
    ? await Promise.all([completedLessonIds(viewer.id, course.id), nextIncompleteLesson(viewer, course.id), listCoursesFor(viewer)])
    : [[], null, []];
  const done = new Set(doneIds);
  const total = modules.reduce((n, m) => n + m.lessons.length, 0);
  const number = mine.findIndex((c) => c.id === course.id) + 1;

  return (
    <main>
      <Link href="/courses" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[.04em] text-muted hover:text-fg">
        <span className="text-accent">←</span> All courses
      </Link>
      <section className="mt-7 grid items-end gap-12 lg:grid-cols-[1fr_360px]">
        <div>
          <Eyebrow accent={number > 0 ? pad(number) : undefined}>Course</Eyebrow>
          <h1 className="mt-3.5 text-[56px] leading-none font-medium tracking-[-.045em]">{course.title}</h1>
          {course.description ? <p className="mt-4 max-w-[600px] text-[17px] text-muted">{course.description}</p> : null}
          <p className="mt-[18px] font-mono text-xs uppercase tracking-[.04em] text-dim">
            {plural(modules.length, "module")} · {plural(total, "lesson")}
          </p>
        </div>
        {total ? (
          <Card className="flex flex-col gap-3.5 p-[22px]">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs uppercase tracking-[.04em] text-muted">Your progress</span>
              <span className="font-mono text-[13px]">
                {done.size} / {total}
              </span>
            </div>
            <ProgressBar value={done.size} max={total} label="Course progress" />
            {next ? (
              <>
                <p className="text-sm text-muted">
                  Next up: <span className="text-fg">{next.lessonTitle}</span>
                </p>
                <PillLink href={`/courses/${course.id}/${next.lessonId}`}>
                  {done.size ? "Resume lesson" : "Start course"} <Icon name="arrow-right" size={16} />
                </PillLink>
              </>
            ) : (
              <p className="text-sm text-ok">✓ Course complete</p>
            )}
          </Card>
        ) : null}
      </section>

      <section className="mt-14 flex flex-col gap-4">
        {modules.map((m, i) => {
          const completed = m.lessons.filter((l) => done.has(l.id)).length;
          const holdsNext = m.lessons.some((l) => l.id === next?.lessonId);
          const finished = m.lessons.length > 0 && completed === m.lessons.length;
          return (
            <details
              key={m.id}
              open={completed > 0 || holdsNext || !next}
              className={`group rounded-md border bg-surface ${holdsNext ? "border-line-strong" : "border-line"}`}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-[18px] [&::-webkit-details-marker]:hidden">
                <div>
                  <Eyebrow accent={`Module ${pad(i + 1)}`} />
                  <h2 className="mt-1 text-xl font-medium tracking-[-.02em]">{m.title}</h2>
                </div>
                <span className="flex items-center gap-3">
                  <span className={`font-mono text-xs ${finished ? "text-ok" : completed ? "text-muted" : "text-dim"}`}>
                    {finished ? "✓ " : ""}
                    {completed} / {m.lessons.length} complete
                  </span>
                  <span className="text-dim transition-transform group-open:rotate-180">
                    <Icon name="chevron-down" size={16} />
                  </span>
                </span>
              </summary>
              {m.lessons.length ? (
                <ol>
                  {m.lessons.map((l) => {
                    const isDone = done.has(l.id);
                    const isNext = l.id === next?.lessonId;
                    return (
                      <li key={l.id}>
                        <Link
                          href={`/courses/${course.id}/${l.id}`}
                          className={`grid grid-cols-[28px_1fr] items-center gap-3 border-t border-line px-5 py-3.5 hover:bg-raised ${isNext ? "bg-raised" : ""}`}
                        >
                          <LessonState done={isDone} next={isNext} />
                          <span className={isDone || isNext ? "" : "text-muted"}>
                            {l.title}
                            {isNext ? <span className="ml-2 font-mono text-[11px] tracking-[.04em] text-accent">UP NEXT</span> : null}
                            {isDone ? <span className="sr-only"> (completed)</span> : null}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="border-t border-line px-5 py-3.5 text-sm text-dim">No lessons yet.</p>
              )}
            </details>
          );
        })}
      </section>
    </main>
  );
}

function LessonState({ done, next }: { done: boolean; next: boolean }) {
  if (done)
    return (
      <span className="flex size-5 items-center justify-center rounded-full border border-ok text-ok">
        <Icon name="check" size={12} />
      </span>
    );
  if (next)
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-accent pl-px text-on-accent">
        <Icon name="play" size={10} />
      </span>
    );
  return <span className="size-5 rounded-full border border-line-strong" />;
}
