import Link from "next/link";
import { inputClass } from "@/components/form";
import { Card, Eyebrow, pillClass, Tag } from "@/components/ui";
import { VideoSummary } from "@/components/video-status";
import { listGroups } from "@/lib/access";
import { listCoursesFor } from "@/lib/courses";
import { courseAdminSummaries } from "@/lib/courses/admin-summary";
import { requireAdmin } from "@/lib/session";
import { createCourseAction } from "./actions";
import { EditorForm } from "./forms";

export const metadata = { title: "Courses · Admin" };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Admin courses (FR-9.1, AC-27). */
export default async function AdminCoursesPage() {
  const admin = await requireAdmin();
  const [courses, summaries, groups] = await Promise.all([listCoursesFor(admin), courseAdminSummaries(), listGroups()]);
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <main className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>
            Admin <b className="font-normal text-accent">·</b> Content
          </Eyebrow>
          <h1 className="mt-2 text-[34px] leading-[1.1] font-medium tracking-[-.035em]">Courses</h1>
        </div>
        <EditorForm action={createCourseAction} submit="Create course" className="flex items-start gap-2">
          <label className="sr-only" htmlFor="new-course-title">
            New course title
          </label>
          <input id="new-course-title" name="title" required placeholder="New course title" className={`${inputClass} w-[260px] py-2`} />
        </EditorForm>
      </div>

      {courses.length ? (
        <Card className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[11px] tracking-[.06em] text-dim uppercase">
                <th className="px-5 py-3 font-normal">Course</th>
                <th className="px-5 py-3 font-normal">Who can see it</th>
                <th className="px-5 py-3 font-normal">Lessons</th>
                <th className="px-5 py-3 font-normal">Videos</th>
                <th className="px-5 py-3 font-normal">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const s = summaries.get(c.id) ?? { moduleCount: 0, lessonCount: 0, videos: { ready: 0, processing: 0, error: 0, none: 0 } };
                return (
                  <tr key={c.id} className="border-b border-line last:border-0 hover:bg-raised">
                    <td className="px-5 py-4">
                      <Link href={`/admin/courses/${c.id}`} className={`font-medium hover:underline ${c.groupIds.length ? "" : "text-[#d6d6d6]"}`}>
                        {c.title}
                      </Link>
                      <div className="font-mono text-xs text-dim">{plural(s.moduleCount, "module")}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex flex-wrap gap-1.5">
                        {c.groupIds.length ? (
                          c.groupIds.map((id) => <Tag key={id}>{groupName.get(id) ?? "Unknown group"}</Tag>)
                        ) : (
                          <Tag tone="dim">Admins only</Tag>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono">{s.lessonCount}</td>
                    <td className="px-5 py-4">
                      <VideoSummary videos={s.videos} lessonCount={s.lessonCount} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/courses/${c.id}`} className={pillClass("secondary", "sm")}>
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="p-6 text-muted">No courses yet. Create one above.</Card>
      )}
      <p className="font-mono text-xs text-dim">Tip: a course with no groups is visible to admins only, which is handy for drafts.</p>
    </main>
  );
}
