// Pure helpers for the lesson page (FR-5.3, AC-14). No database access.

type OutlineShape = { modules: { id: string; title: string; lessons: { id: string; title: string }[] }[] };

export type LessonPosition = {
  moduleNumber: number;
  moduleTitle: string;
  lessonNumber: number;
  next: { id: string; title: string } | null;
};

/** Where a lesson sits in the outline (1-based numbers) and the lesson after it, crossing into later modules. */
export function lessonPosition(outline: OutlineShape, lessonId: string): LessonPosition | null {
  const flat = outline.modules.flatMap((m, mi) => m.lessons.map((l, li) => ({ lesson: l, module: m, moduleNumber: mi + 1, lessonNumber: li + 1 })));
  const i = flat.findIndex((f) => f.lesson.id === lessonId);
  if (i === -1) return null;
  const here = flat[i]!;
  const after = flat[i + 1];
  return {
    moduleNumber: here.moduleNumber,
    moduleTitle: here.module.title,
    lessonNumber: here.lessonNumber,
    next: after ? { id: after.lesson.id, title: after.lesson.title } : null,
  };
}
