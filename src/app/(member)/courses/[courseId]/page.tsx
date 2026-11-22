import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NoAccess } from "@/components/no-access";
import { canAccess } from "@/lib/access";
import { getCourseOutline, plansGranting } from "@/lib/courses";
import { getViewer } from "@/lib/session";

export default function CoursePage({ params }: PageProps<"/courses/[courseId]">) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Course params={params} />
    </Suspense>
  );
}

async function Course({ params }: Pick<PageProps<"/courses/[courseId]">, "params">) {
  const { courseId } = await params;
  const [outline, viewer] = await Promise.all([getCourseOutline(courseId), getViewer()]);
  if (!outline) notFound();
  const { course, modules } = outline;
  if (!(await canAccess(viewer, course.groupIds))) {
    return <NoAccess title={course.title} plans={await plansGranting(course.groupIds)} signedIn={Boolean(viewer)} />;
  }

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{course.title}</h1>
        {course.description ? <p className="mt-1 text-zinc-600 dark:text-zinc-400">{course.description}</p> : null}
      </div>
      {modules.map((m) => (
        <section key={m.id} className="flex flex-col gap-2">
          <h2 className="font-semibold">{m.title}</h2>
          {m.lessons.length ? (
            <ol className="flex flex-col divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {m.lessons.map((l) => (
                <li key={l.id}>
                  <Link href={`/courses/${course.id}/${l.id}`} className="block px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    {l.title}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-zinc-500">No lessons yet.</p>
          )}
        </section>
      ))}
    </main>
  );
}
