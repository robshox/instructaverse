import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { listCoursesFor } from "@/lib/courses";
import { getViewer } from "@/lib/session";

export const metadata = { title: "Courses" };

export default function CoursesPage() {
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Courses</h1>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <CourseList />
      </Suspense>
    </main>
  );
}

async function CourseList() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const courses = await listCoursesFor(viewer);
  if (!courses.length) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">
        You don&rsquo;t have any courses yet. <Link href="/pricing" className="underline">See plans</Link>
      </p>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {courses.map((c) => (
        <li key={c.id}>
          <Link href={`/courses/${c.id}`} className="flex h-full flex-col gap-2 rounded-lg border border-zinc-200 p-5 hover:border-zinc-400 dark:border-zinc-800">
            <span className="text-lg font-semibold">{c.title}</span>
            {c.description ? <span className="text-sm text-zinc-600 dark:text-zinc-400">{c.description}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
