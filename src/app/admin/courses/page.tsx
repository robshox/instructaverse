import Link from "next/link";
import { Field } from "@/components/form";
import { listCoursesFor } from "@/lib/courses";
import { requireAdmin } from "@/lib/session";
import { createCourseAction } from "./actions";
import { EditorForm } from "./forms";

export const metadata = { title: "Courses · Admin" };

export default async function AdminCoursesPage() {
  const admin = await requireAdmin();
  const courses = await listCoursesFor(admin);
  return (
    <main className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Courses</h1>
      {courses.length ? (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {courses.map((c) => (
            <li key={c.id} className="flex justify-between py-3">
              <Link href={`/admin/courses/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                {c.title}
              </Link>
              <span className="text-sm text-zinc-500">{c.groupIds.length ? `${c.groupIds.length} group(s)` : "Admins only"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">No courses yet.</p>
      )}
      <section className="flex max-w-md flex-col gap-3">
        <h2 className="text-lg font-semibold">New course</h2>
        <EditorForm action={createCourseAction} submit="Create course">
          <Field label="Title" name="title" required />
        </EditorForm>
      </section>
    </main>
  );
}
