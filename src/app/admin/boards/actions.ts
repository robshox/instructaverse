"use server";

import { refresh } from "next/cache";
import { BoardInputError, createBoard, deleteBoard, updateBoard } from "@/lib/community/boards";
import { requireAdmin } from "@/lib/session";

export type BoardFormState = { error?: string; ok?: number };

export async function saveBoardAction(_prev: BoardFormState, f: FormData): Promise<BoardFormState> {
  await requireAdmin();
  const input = { name: String(f.get("name") ?? ""), groupIds: f.getAll("groupIds").map(String) };
  const id = f.get("id");
  try {
    if (typeof id === "string" && id) await updateBoard(id, input);
    else await createBoard(input);
  } catch (e) {
    if (e instanceof BoardInputError) return { error: e.message };
    throw e;
  }
  refresh();
  return { ok: Date.now() };
}

export async function deleteBoardAction(f: FormData) {
  await requireAdmin();
  if (f.get("confirm") !== "yes") return;
  await deleteBoard(String(f.get("id")));
  refresh();
}
