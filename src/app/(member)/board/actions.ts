"use server";

import { refresh } from "next/cache";
import { createPost, NoBoardAccessError, PostInputError } from "@/lib/community/posts";
import { getViewer } from "@/lib/session";

export type PostFormState = { error?: string; ok?: number };

export async function createPostAction(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  try {
    await createPost(await getViewer(), String(formData.get("boardId") ?? ""), {
      bodyMd: String(formData.get("bodyMd") ?? ""),
      images: formData.getAll("images").filter((f): f is File => f instanceof File),
    });
  } catch (e) {
    if (e instanceof PostInputError || e instanceof NoBoardAccessError) return { error: e.message };
    throw e;
  }
  refresh();
  return { ok: Date.now() };
}
