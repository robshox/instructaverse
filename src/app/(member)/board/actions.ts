"use server";

import { refresh } from "next/cache";
import { createPost, NoBoardAccessError, PostInputError } from "@/lib/community/posts";
import { getViewer } from "@/lib/session";
import { addComment, deleteComment, editComment } from "@/lib/community/comments";
import { setLike, type LikeTarget } from "@/lib/community/likes";
import { deletePost, editPost, NotAllowedError, pinPost } from "@/lib/community/moderation";

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

// ---- editing, moderation and comments (AC-24, AC-25) ----


export type ActionResult = { error?: string; ok?: number };

async function run(work: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await work();
  } catch (e) {
    if (e instanceof NotAllowedError || e instanceof PostInputError || e instanceof NoBoardAccessError) return { error: e.message };
    throw e;
  }
  refresh();
  return { ok: Date.now() };
}

const field = (f: FormData, k: string) => String(f.get(k) ?? "");

export async function editPostAction(_p: ActionResult, f: FormData) {
  return run(async () => editPost(await getViewer(), field(f, "postId"), field(f, "bodyMd")));
}
export async function deletePostAction(_p: ActionResult, f: FormData) {
  return run(async () => deletePost(await getViewer(), field(f, "postId")));
}
export async function pinPostAction(_p: ActionResult, f: FormData) {
  return run(async () => pinPost(await getViewer(), field(f, "postId"), f.get("pinned") === "true"));
}
export async function addCommentAction(_p: ActionResult, f: FormData) {
  return run(async () => addComment(await getViewer(), field(f, "postId"), field(f, "body")));
}
export async function editCommentAction(_p: ActionResult, f: FormData) {
  return run(async () => editComment(await getViewer(), field(f, "commentId"), field(f, "body")));
}
export async function deleteCommentAction(_p: ActionResult, f: FormData) {
  return run(async () => deleteComment(await getViewer(), field(f, "commentId")));
}

export async function setLikeAction(target: LikeTarget, liked: boolean): Promise<ActionResult> {
  return run(async () => setLike(await getViewer(), target, liked));
}
