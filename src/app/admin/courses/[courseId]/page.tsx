import Link from "next/link";
import { notFound } from "next/navigation";
import { Field, inputClass } from "@/components/form";
import { listGroups } from "@/lib/access";
import { getCourseOutline } from "@/lib/courses";
import { requireAdmin } from "@/lib/session";
import { addLessonAction, addModuleAction, deleteCourseAction, outlineAction, renameModuleAction, saveCourseAction } from "../actions";
import { EditorForm } from "../forms";

const small = "rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700";

export default async function CourseEditorPage({ params }: PageProps<"/admin/courses/[courseId]">) {
  await requireAdmin();
  const { courseId } = await params;
  const [outline, groups] = await Promise.all([getCourseOutline(courseId), listGroups()]);
  if (!outline) notFound();
  const { course, modules } = outline;

  return (
    <main className="flex flex-col gap-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{course.title}</h1>
        <Link href={`/courses/${course.id}`} className="text-sm underline">
          View as member
        </Link>
      </div>

      <section className="flex max-w-xl flex-col gap-3">
        <h2 className="text-lg font-semibold">Details</h2>
        <EditorForm action={saveCourseAction} submit="Save details">
          <input type="hidden" name="id" value={course.id} />
          <Field label="Title" name="title" defaultValue={course.title} required />
          <label className="flex flex-col gap-1 text-sm font-medium">
            Description
            <textarea name="description" defaultValue={course.description} rows={2} className={inputClass} />
          </label>
          <fieldset className="text-sm">
            <legend className="mb-1 font-medium">Who can see it</legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {groups.map((g) => (
                <label key={g.id} className="flex items-center gap-2">
                  <input type="checkbox" name="groupIds" value={g.id} defaultChecked={course.groupIds.includes(g.id)} />
                  {g.name}
                </label>
              ))}
            </div>
            <p className="mt-1 text-zinc-500">No groups ticked means only admins can see it.</p>
          </fieldset>
        </EditorForm>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Modules and lessons</h2>
        <form action={outlineAction} className="flex flex-col gap-6">
          {modules.map((m, mi) => (
            <div key={m.id} className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{m.title}</span>
                <button name="do" value={`module:up:${m.id}`} disabled={mi === 0} className={small} aria-label={`Move ${m.title} up`}>
                  ↑
                </button>
                <button name="do" value={`module:down:${m.id}`} disabled={mi === modules.length - 1} className={small} aria-label={`Move ${m.title} down`}>
                  ↓
                </button>
                <label className="ml-auto flex items-center gap-1 text-xs">
                  <input type="checkbox" name={`confirm-${m.id}`} value="yes" /> confirm
                </label>
                <button name="do" value={`module:delete:${m.id}`} className={`${small} text-red-700`}>
                  Delete module
                </button>
              </div>
              <ol className="flex flex-col gap-1">
                {m.lessons.map((l, li) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <Link href={`/admin/courses/${course.id}/lessons/${l.id}`} className="underline-offset-4 hover:underline">
                      {l.title}
                    </Link>
                    <button name="do" value={`lesson:up:${l.id}`} disabled={li === 0} className={small} aria-label={`Move ${l.title} up`}>
                      ↑
                    </button>
                    <button name="do" value={`lesson:down:${l.id}`} disabled={li === m.lessons.length - 1} className={small} aria-label={`Move ${l.title} down`}>
                      ↓
                    </button>
                    <label className="ml-auto flex items-center gap-1 text-xs">
                      <input type="checkbox" name={`confirm-${l.id}`} value="yes" /> confirm
                    </label>
                    <button name="do" value={`lesson:delete:${l.id}`} className={`${small} text-red-700`}>
                      Delete
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </form>
        {/* Add/rename forms live outside the move/delete form (forms can't nest). */}
        {modules.map((m) => (
          <div key={m.id} className="flex flex-wrap gap-6">
            <EditorForm action={renameModuleAction} submit={`Rename “${m.title}”`} className="flex items-end gap-2">
              <input type="hidden" name="id" value={m.id} />
              <Field label="Module title" name="title" defaultValue={m.title} required />
            </EditorForm>
            <EditorForm action={addLessonAction} submit={`Add lesson to “${m.title}”`} resetOnSuccess className="flex items-end gap-2">
              <input type="hidden" name="moduleId" value={m.id} />
              <Field label="New lesson title" name="title" required />
            </EditorForm>
          </div>
        ))}
        <EditorForm action={addModuleAction} submit="Add module" resetOnSuccess className="flex max-w-md items-end gap-2">
          <input type="hidden" name="courseId" value={course.id} />
          <Field label="New module title" name="title" required />
        </EditorForm>
      </section>

      <form action={deleteCourseAction} className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-6 text-sm dark:border-zinc-800">
        <input type="hidden" name="id" value={course.id} />
        <label className="flex items-center gap-2">
          <input type="checkbox" name="confirm" value="yes" required />
          Delete this course, its lessons and members&rsquo; progress
        </label>
        <button className="rounded-md bg-red-700 px-3 py-1.5 font-medium text-white">Delete course</button>
      </form>
    </main>
  );
}
