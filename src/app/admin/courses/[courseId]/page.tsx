import Link from "next/link";
import { notFound } from "next/navigation";
import { Field, inputClass, labelClass } from "@/components/form";
import { Icon } from "@/components/icon";
import { SortableList } from "@/components/sortable-list";
import { Card, ChipCheckbox, Eyebrow, pillClass } from "@/components/ui";
import { VideoStatusTag } from "@/components/video-status";
import { listGroups } from "@/lib/access";
import { getCourseOutline } from "@/lib/courses";
import { videoStatus } from "@/lib/courses/admin-summary";
import { requireAdmin } from "@/lib/session";
import { reorderLessonsAction, reorderModulesAction } from "../../reorder-actions";
import { addLessonAction, addModuleAction, deleteCourseAction, outlineAction, renameModuleAction, saveCourseAction } from "../actions";
import { EditorForm } from "../forms";

const pad = (n: number) => String(n).padStart(2, "0");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const OPS = "outline-ops"; // delete buttons live in rows but submit this one form (forms can't nest)

/** Course editor (FR-9.2, FR-9.3, AC-28). */
export default async function CourseEditorPage({ params }: PageProps<"/admin/courses/[courseId]">) {
  await requireAdmin();
  const { courseId } = await params;
  const [outline, groups] = await Promise.all([getCourseOutline(courseId), listGroups()]);
  if (!outline) notFound();
  const { course, modules } = outline;
  const allLessons = modules.flatMap((m) => m.lessons);
  const counts = { ready: 0, processing: 0, error: 0, none: 0 };
  for (const l of allLessons) counts[videoStatus(l.muxStatus)] += 1;

  return (
    <main className="flex flex-col gap-6">
      <form id={OPS} action={outlineAction} hidden />
      <div>
        <Link href="/admin/courses" className="font-mono text-xs uppercase tracking-[.04em] text-muted hover:text-fg">
          <span className="text-accent">←</span> Courses
        </Link>
        <div className="mt-2.5 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[34px] leading-[1.1] font-medium tracking-[-.035em]">{course.title}</h1>
          <Link href={`/courses/${course.id}`} className={pillClass("secondary")}>
            <Icon name="eye" size={15} /> View as member
          </Link>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_280px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="p-5">
            <EditorForm action={saveCourseAction} submit="Save details">
              <input type="hidden" name="id" value={course.id} />
              <Field label="Title" name="title" defaultValue={course.title} required />
              <label className={labelClass}>
                Description
                <textarea
                  name="description"
                  defaultValue={course.description}
                  rows={2}
                  className={`${inputClass} font-sans text-[15px] tracking-normal normal-case`}
                />
              </label>
              <fieldset>
                <legend className={`${labelClass} mb-2`}>Who can see it</legend>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => (
                    <ChipCheckbox key={g.id} name="groupIds" value={g.id} defaultChecked={course.groupIds.includes(g.id)}>
                      {g.name}
                    </ChipCheckbox>
                  ))}
                </div>
                <p className="mt-2 font-mono text-xs text-dim">None selected = admins only.</p>
              </fieldset>
            </EditorForm>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <Eyebrow accent="Modules & lessons" />
              <span className="font-mono text-xs text-dim">Drag to reorder</span>
            </div>
            <SortableList
              label="Modules"
              onReorder={reorderModulesAction.bind(null, course.id)}
              itemClassName="items-start border-t border-line bg-[#101010] pl-4 [&>span:first-child]:pt-3.5 [&>span:last-child]:pt-3 [&>span:last-child]:pr-3"
              items={modules.map((m, mi) => ({
                id: m.id,
                label: m.title,
                content: (
                  <div className="py-3">
                    <div className="flex flex-wrap items-center gap-2.5 pr-2">
                      <span className="font-mono text-xs text-accent">{pad(mi + 1)}</span>
                      <span className="font-medium">{m.title}</span>
                      <span className="ml-auto font-mono text-xs text-dim">{plural(m.lessons.length, "lesson")}</span>
                      <details className="relative">
                        <summary
                          className="cursor-pointer list-none text-muted hover:text-fg [&::-webkit-details-marker]:hidden"
                          aria-label={`${m.title} options`}
                        >
                          <Icon name="ellipsis" size={16} />
                        </summary>
                        <div className="absolute right-0 z-10 mt-2 flex w-72 flex-col gap-3 rounded-md border border-line-strong bg-raised p-3 shadow-xl">
                          <EditorForm action={renameModuleAction} submit="Rename" size="sm" className="flex flex-col gap-2">
                            <input type="hidden" name="id" value={m.id} />
                            <Field label="Module title" name="title" defaultValue={m.title} required />
                          </EditorForm>
                          <div className="flex items-center gap-2 border-t border-line pt-3 text-xs text-muted">
                            <label className="flex items-center gap-1.5">
                              <input type="checkbox" form={OPS} name={`confirm-${m.id}`} value="yes" /> confirm
                            </label>
                            <button form={OPS} name="do" value={`module:delete:${m.id}`} className={pillClass("danger", "sm", "ml-auto")}>
                              Delete module
                            </button>
                          </div>
                        </div>
                      </details>
                    </div>
                    <div className="mt-2 -ml-4 border-t border-line bg-surface">
                      {m.lessons.length ? (
                        <SortableList
                          label={`Lessons in ${m.title}`}
                          onReorder={reorderLessonsAction.bind(null, m.id)}
                          itemClassName="border-b border-line py-2.5 pr-3 pl-4 text-sm hover:bg-raised"
                          items={m.lessons.map((l) => ({
                            id: l.id,
                            label: l.title,
                            content: (
                              <div className="flex flex-wrap items-center gap-3">
                                <Link href={`/admin/courses/${course.id}/lessons/${l.id}`} className="hover:underline">
                                  {l.title}
                                </Link>
                                <span className="ml-auto">
                                  <VideoStatusTag status={videoStatus(l.muxStatus)} />
                                </span>
                                <details className="relative">
                                  <summary
                                    className="cursor-pointer list-none text-dim hover:text-danger [&::-webkit-details-marker]:hidden"
                                    aria-label={`Delete ${l.title}`}
                                  >
                                    <Icon name="trash-2" size={14} />
                                  </summary>
                                  <div className="absolute right-0 z-10 mt-2 flex w-60 items-center gap-2 rounded-md border border-line-strong bg-raised p-3 text-xs text-muted shadow-xl">
                                    <label className="flex items-center gap-1.5">
                                      <input type="checkbox" form={OPS} name={`confirm-${l.id}`} value="yes" /> confirm
                                    </label>
                                    <button form={OPS} name="do" value={`lesson:delete:${l.id}`} className={pillClass("danger", "sm", "ml-auto")}>
                                      Delete
                                    </button>
                                  </div>
                                </details>
                              </div>
                            ),
                          }))}
                        />
                      ) : (
                        <p className="border-b border-line px-4 py-2.5 text-sm text-dim">No lessons yet.</p>
                      )}
                      <EditorForm
                        action={addLessonAction}
                        submit="Add lesson"
                        size="sm"
                        resetOnSuccess
                        className="flex flex-wrap items-center gap-2 px-4 py-2.5"
                      >
                        <input type="hidden" name="moduleId" value={m.id} />
                        <label className="sr-only" htmlFor={`add-lesson-${m.id}`}>
                          New lesson title in {m.title}
                        </label>
                        <input
                          id={`add-lesson-${m.id}`}
                          name="title"
                          required
                          placeholder={`+ Add lesson to ${m.title}`}
                          className="min-w-0 flex-1 border-0 border-b border-dashed border-line-strong bg-transparent py-1.5 font-mono text-xs text-fg outline-none placeholder:text-muted focus:border-accent"
                        />
                      </EditorForm>
                    </div>
                  </div>
                ),
              }))}
            />
            <EditorForm
              action={addModuleAction}
              submit="Add module"
              size="sm"
              resetOnSuccess
              className="flex flex-wrap items-center gap-2 border-t border-dashed border-line-strong px-4 py-3"
            >
              <input type="hidden" name="courseId" value={course.id} />
              <label className="sr-only" htmlFor="add-module">
                New module title
              </label>
              <input
                id="add-module"
                name="title"
                required
                placeholder="+ Add module"
                className="min-w-0 flex-1 bg-transparent py-1.5 font-mono text-xs text-fg outline-none placeholder:text-accent focus:placeholder:text-dim"
              />
            </EditorForm>
          </Card>
        </div>

        <aside className="flex flex-col gap-5">
          <Card className="flex flex-col gap-2.5 p-[18px]">
            <Eyebrow accent="Summary" />
            <p className="font-mono text-[13px] leading-[1.9] text-muted">
              {plural(modules.length, "module")}
              <br />
              {plural(allLessons.length, "lesson")}
              <br />
              <span className="text-ok">✓</span> {counts.ready} videos ready
              {counts.processing ? (
                <>
                  <br />
                  <span className="text-warn">●</span> {counts.processing} processing
                </>
              ) : null}
              {counts.error ? (
                <>
                  <br />
                  <span className="text-danger">●</span> {counts.error} with errors
                </>
              ) : null}
              {counts.none ? (
                <>
                  <br />
                  <span className="text-dim">—</span> {counts.none} without video
                </>
              ) : null}
            </p>
          </Card>
          <section className="flex flex-col gap-2.5 rounded-md border border-danger/35 bg-surface p-[18px]">
            <p className="font-mono text-xs tracking-[.04em] text-danger uppercase">Danger zone</p>
            <p className="text-[13px] text-muted">Deletes the course, its lessons and members&rsquo; progress. Videos stay in Mux.</p>
            <form action={deleteCourseAction} className="flex flex-col gap-2.5">
              <input type="hidden" name="id" value={course.id} />
              <label className="flex items-center gap-2 text-[13px] text-muted">
                <input type="checkbox" name="confirm" value="yes" required />
                Yes, delete this course
              </label>
              <button className={pillClass("danger", "sm", "self-start")}>Delete course…</button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
