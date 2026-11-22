"use server";

import { refresh } from "next/cache";
import { createGroup, deleteGroup, GroupNameError, renameGroup } from "@/lib/access";
import { requireAdmin } from "@/lib/session";

export type GroupFormState = { error?: string; ok?: number };

function failure(e: unknown): GroupFormState {
  if (e instanceof GroupNameError) return { error: e.message };
  throw e;
}

export async function createGroupAction(_prev: GroupFormState, formData: FormData): Promise<GroupFormState> {
  await requireAdmin();
  try {
    await createGroup(String(formData.get("name") ?? ""));
  } catch (e) {
    return failure(e);
  }
  refresh();
  return { ok: Date.now() };
}

export async function renameGroupAction(_prev: GroupFormState, formData: FormData): Promise<GroupFormState> {
  await requireAdmin();
  try {
    await renameGroup(String(formData.get("id")), String(formData.get("name") ?? ""));
  } catch (e) {
    return failure(e);
  }
  refresh();
  return { ok: Date.now() };
}

export async function deleteGroupAction(formData: FormData): Promise<void> {
  await requireAdmin();
  if (formData.get("confirm") !== "yes") return;
  await deleteGroup(String(formData.get("id")));
  refresh();
}
