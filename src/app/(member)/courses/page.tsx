import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { DateBlock, LocalTime } from "@/components/local-time";
import { Card, Eyebrow, PillLink, ProgressBar } from "@/components/ui";
import { getBrand } from "@/lib/brand";
import { latestVisiblePost, type LatestPost } from "@/lib/community/posts";
import { learningSummary, nextIncompleteLesson, type CourseSummary, type OutlineLesson } from "@/lib/courses/progress";
import { nextVisibleEvent, type EventView } from "@/lib/events";
import { getViewer } from "@/lib/session";

export const metadata = { title: "Courses" };

/** Member home (FR-4.1, AC-8 to AC-12). */
export default function CoursesPage() {
  return (
    <main>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Home />
      </Suspense>
    </main>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

async function Home() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const [summary, next, event, post] = await Promise.all([
    learningSummary(viewer),
    nextIncompleteLesson(viewer),
    nextVisibleEvent(viewer),
    latestVisiblePost(viewer),
  ]);
  const brand = getBrand();
  const firstName = viewer.name.trim().split(/\s+/)[0] || "there";
  const nextCourse = next ? summary.courses.find((c) => c.course.id === next.courseId) : undefined;

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-8">
        <div>
          <Eyebrow>
            {brand.name} <b className="font-normal text-accent">·</b> Member area
          </Eyebrow>
          <h1 className="mt-4 text-[52px] leading-[1.02] font-medium tracking-[-.04em]">Welcome back, {firstName}.</h1>
          <p className="mt-3.5 max-w-[520px] text-[17px] text-muted">
            Pick up where you left off, or start something new. Every course and the community, in one place.
          </p>
        </div>
        {summary.totals.total > 0 ? (
          <Card className="min-w-[300px] px-[18px] py-3.5 font-mono text-[13px] leading-[1.9]">
            <div>
              <span className="text-accent">&gt;</span> /progress
            </div>
            <div className="text-muted">
              <span className="text-ok">✓</span> {summary.totals.completed} of {summary.totals.total} lessons complete
            </div>
          </Card>
        ) : null}
      </section>

      {next && nextCourse ? <ContinueCard next={next} course={nextCourse} /> : null}

      <section className="mt-14 grid items-start gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-medium tracking-[-.03em]">Your courses</h2>
            <span className="font-mono text-xs uppercase tracking-[.04em] text-muted">
              {summary.courses.length} {summary.courses.length === 1 ? "course" : "courses"}
            </span>
          </div>
          {summary.courses.length ? (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {summary.courses.map((c, i) => (
                <li key={c.course.id}>
                  <CourseCard summary={c} index={i} />
                </li>
              ))}
            </ul>
          ) : (
            <Card className="mt-5 flex flex-col items-start gap-3 p-6">
              <p className="text-muted">You don&rsquo;t have any courses yet.</p>
              <PillLink href="/pricing">
                See plans <Icon name="arrow-right" size={16} />
              </PillLink>
            </Card>
          )}
        </div>
        {event || post ? (
          <aside className="flex flex-col gap-4">
            {event ? <EventPanel event={event} /> : null}
            {post ? <PostPanel post={post} /> : null}
          </aside>
        ) : null}
      </section>
    </>
  );
}

function ContinueCard({ next, course }: { next: OutlineLesson; course: CourseSummary }) {
  const href = `/courses/${next.courseId}/${next.lessonId}`;
  return (
    <section className="mt-12 grid overflow-hidden rounded-md border border-line bg-surface md:grid-cols-[380px_1fr]">
      <Link
        href={href}
        aria-label={`Play ${next.lessonTitle}`}
        className="relative flex aspect-video items-center justify-center border-line bg-[radial-gradient(120%_120%_at_80%_20%,#2a1406_0%,#121212_55%)] md:border-r"
      >
        <Eyebrow accent={`Module ${pad(next.moduleNumber)}`} className="absolute top-4 left-[18px]">
          Lesson {next.lessonNumber}
        </Eyebrow>
        <span className="flex size-14 items-center justify-center rounded-full bg-accent text-on-accent">
          <Icon name="play" size={22} />
        </span>
      </Link>
      <div className="flex flex-col gap-3.5 px-8 py-7">
        <Eyebrow accent="Continue">{course.course.title}</Eyebrow>
        <h2 className="text-[28px] leading-[1.15] font-medium tracking-[-.03em]">{next.lessonTitle}</h2>
        <p className="font-mono text-xs text-muted">{next.moduleTitle}</p>
        <div className="mt-auto flex flex-wrap items-center gap-4">
          <ProgressBar value={course.completed} max={course.lessonCount} label={`${course.course.title} progress`} className="min-w-32 flex-1" />
          <span className="font-mono text-xs text-muted">
            {course.completed} / {course.lessonCount}
          </span>
          <PillLink href={href}>
            Resume lesson <Icon name="arrow-right" size={16} />
          </PillLink>
        </div>
      </div>
    </section>
  );
}

function CourseCard({ summary: c, index }: { summary: CourseSummary; index: number }) {
  return (
    <Link
      href={`/courses/${c.course.id}`}
      className="flex h-full flex-col gap-3 rounded-md border border-line bg-surface p-6 transition-colors hover:border-line-strong"
    >
      <Eyebrow accent={pad(index + 1)}>Course</Eyebrow>
      <h3 className="text-[21px] font-medium tracking-[-.02em]">{c.course.title}</h3>
      {c.course.description ? <p className="text-sm text-muted">{c.course.description}</p> : null}
      <p className="mt-auto pt-2 font-mono text-xs text-dim">
        {c.moduleCount} {c.moduleCount === 1 ? "module" : "modules"} · {c.lessonCount} {c.lessonCount === 1 ? "lesson" : "lessons"}
      </p>
      <div className="flex items-center gap-3">
        <ProgressBar value={c.completed} max={c.lessonCount} label={`${c.course.title} progress`} className="flex-1" />
        <span className="font-mono text-xs text-muted">{c.completed === 0 ? "Not started" : `${c.percent}%`}</span>
      </div>
    </Link>
  );
}

function EventPanel({ event }: { event: EventView }) {
  const iso = event.startsAt.toISOString();
  return (
    <Card className="flex flex-col gap-3 p-5">
      <Eyebrow accent="Next live session" />
      <div className="flex items-start gap-3.5">
        <DateBlock iso={iso} fallbackZone={event.timezone} />
        <div>
          <h3 className="font-medium tracking-[-.01em]">{event.title}</h3>
          <p className="mt-0.5 font-mono text-xs text-muted">
            <LocalTime iso={iso} fallbackZone={event.timezone} />
          </p>
        </div>
      </div>
      <PillLink href="/events" variant="secondary">
        View events
      </PillLink>
    </Card>
  );
}

function PostPanel({ post }: { post: LatestPost }) {
  const text = post.bodyMd.replace(/[#*_`>\[\]()!]/g, "").replace(/\s+/g, " ").trim();
  const excerpt = text.length > 140 ? `${text.slice(0, 140).trimEnd()}…` : text;
  const author = post.author.name.trim().split(/\s+/);
  const authorShort = author.length > 1 ? `${author[0]} ${author.at(-1)![0]}.` : author[0];
  return (
    <Link href={`/board/${post.boardId}`} className="flex flex-col gap-2.5 rounded-md border border-line bg-surface p-5 transition-colors hover:border-line-strong">
      <Eyebrow accent="From the board">{post.boardName}</Eyebrow>
      <p>&ldquo;{excerpt}&rdquo;</p>
      <p className="font-mono text-xs text-muted">
        {authorShort} · {post.replies} {post.replies === 1 ? "reply" : "replies"} · {post.likes} {post.likes === 1 ? "like" : "likes"}
      </p>
    </Link>
  );
}
