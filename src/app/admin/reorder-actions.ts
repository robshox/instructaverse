"use server";

import { refresh } from "next/cache";
import type { ReorderResult } from "@/components/sortable-list";
import { ReorderError, reorderBoards, reorderLessons, reorderModules } from "@/lib/reorder";
import { requireAdmin } from "@/lib/session";

// Admin-only reorder actions (AC-28, AC-29). Non-admins are stopped by requireAdmin.

async function run(work: () => Promise<void>): Promise<ReorderResult> {
  await requireAdmin();
  try {
    await work();
  } catch (e) {
    if (e instanceof ReorderError) return { error: e.message };
    throw e;
  }
  refresh();
  return {};
}

const ids = (value: unknown) => (Array.isArray(value) && value.every((v) => typeof v === "string") ? (value as string[]) : null);

export async function reorderLessonsAction(moduleId: string, order: string[]) {
  const list = ids(order);
  return list ? run(() => reorderLessons(moduleId, list)) : { error: "Invalid order" };
}

export async function reorderModulesAction(courseId: string, order: string[]) {
  const list = ids(order);
  return list ? run(() => reorderModules(courseId, list)) : { error: "Invalid order" };
}

export async function reorderBoardsAction(order: string[]) {
  const list = ids(order);
  return list ? run(() => reorderBoards(list)) : { error: "Invalid order" };
}
