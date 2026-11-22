import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { boards, lessons, modules } from "@/db/schema";

// Drag-and-drop reorder (AD-6, AC-28, AC-29). Each takes the complete new order;
// the IDs must be exactly the current set, or nothing changes.

export class ReorderError extends Error {}

function assertSameSet(current: string[], next: string[]) {
  const unique = new Set(next);
  if (unique.size !== next.length || next.length !== current.length || !current.every((id) => unique.has(id))) {
    throw new ReorderError("That order doesn't match the current items. Reload and try again.");
  }
}

export async function reorderLessons(moduleId: string, ids: string[]) {
  db.transaction((tx) => {
    const current = tx.select({ id: lessons.id }).from(lessons).where(eq(lessons.moduleId, moduleId)).orderBy(asc(lessons.position)).all();
    assertSameSet(
      current.map((r) => r.id),
      ids,
    );
    ids.forEach((id, position) => tx.update(lessons).set({ position }).where(eq(lessons.id, id)).run());
  });
}

export async function reorderModules(courseId: string, ids: string[]) {
  db.transaction((tx) => {
    const current = tx.select({ id: modules.id }).from(modules).where(eq(modules.courseId, courseId)).all();
    assertSameSet(
      current.map((r) => r.id),
      ids,
    );
    ids.forEach((id, position) => tx.update(modules).set({ position }).where(eq(modules.id, id)).run());
  });
}

export async function reorderBoards(ids: string[]) {
  db.transaction((tx) => {
    const current = tx.select({ id: boards.id }).from(boards).all();
    assertSameSet(
      current.map((r) => r.id),
      ids,
    );
    ids.forEach((id, position) => tx.update(boards).set({ position }).where(eq(boards.id, id)).run());
  });
}
