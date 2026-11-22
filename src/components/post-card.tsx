"use client";

import { useActionState, useState } from "react";
import {
  addCommentAction,
  deleteCommentAction,
  deletePostAction,
  editCommentAction,
  editPostAction,
  pinPostAction,
  type ActionResult,
} from "@/app/(member)/board/actions";
import { FormMessage, inputClass } from "@/components/form";
import { Markdown } from "@/components/markdown";
import type { CommentView } from "@/lib/community/comments";
import type { PostView } from "@/lib/community/posts";

type Viewer = { id: string; role: string };
type Action = (prev: ActionResult, f: FormData) => Promise<ActionResult>;

const linkButton = "text-xs text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400";
const when = (d: Date) => new Date(d).toLocaleString("en", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const edited = (x: { createdAt: Date; updatedAt: Date }) => new Date(x.updatedAt).getTime() - new Date(x.createdAt).getTime() > 1000;

/** A form that calls `action` and shows its error. `onDone` runs after success. */
function ActionForm({ action, children, className, onDone }: { action: Action; children: React.ReactNode; className?: string; onDone?: () => void }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(async (prev, f) => {
    const result = await action(prev, f);
    if (result.ok) onDone?.();
    return result;
  }, {});
  return (
    <form action={formAction} className={className}>
      {children}
      {state.error ? <FormMessage error={state.error} /> : null}
    </form>
  );
}

function ConfirmDelete({ action, hidden, label }: { action: Action; hidden: Record<string, string>; label: string }) {
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-red-700 dark:text-red-400">Delete</summary>
      <ActionForm action={action} className="mt-1 flex items-center gap-2">
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <span>{label}</span>
        <button className="rounded bg-red-700 px-2 py-0.5 font-medium text-white">Delete</button>
      </ActionForm>
    </details>
  );
}

export function PostCard({ post, comments, viewer }: { post: PostView; comments: CommentView[]; viewer: Viewer }) {
  const [editing, setEditing] = useState(false);
  const isAuthor = post.author.id === viewer.id;
  const isAdmin = viewer.role === "admin";

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{post.author.name}</span>
        <span className="text-zinc-500">
          {when(post.createdAt)}
          {edited(post) ? " · edited" : ""}
        </span>
        {post.pinned ? <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-900">Pinned</span> : null}
        <span className="ml-auto flex items-center gap-3">
          {isAdmin ? (
            <ActionForm action={pinPostAction}>
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="pinned" value={String(!post.pinned)} />
              <button className={linkButton}>{post.pinned ? "Unpin" : "Pin"}</button>
            </ActionForm>
          ) : null}
          {isAuthor && !editing ? (
            <button type="button" className={linkButton} onClick={() => setEditing(true)}>
              Edit
            </button>
          ) : null}
          {isAuthor || isAdmin ? <ConfirmDelete action={deletePostAction} hidden={{ postId: post.id }} label="Delete this post and its comments?" /> : null}
        </span>
      </div>

      {editing ? (
        <ActionForm action={editPostAction} onDone={() => setEditing(false)} className="flex flex-col gap-2">
          <input type="hidden" name="postId" value={post.id} />
          <label className="sr-only" htmlFor={`edit-${post.id}`}>
            Edit post
          </label>
          <textarea id={`edit-${post.id}`} name="bodyMd" defaultValue={post.bodyMd} required rows={3} className={inputClass} />
          <div className="flex gap-2 text-sm">
            <button className="rounded-md bg-zinc-900 px-3 py-1 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">Save</button>
            <button type="button" className="px-3 py-1" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </ActionForm>
      ) : (
        <Markdown>{post.bodyMd}</Markdown>
      )}

      {post.images.length ? (
        <div className={`grid gap-2 ${post.images.length > 1 ? "grid-cols-2" : ""}`}>
          {post.images.map((img) => (
            // Served through the access-checked /media route, so next/image's optimiser isn't used.
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.id} src={`/media/${img.path}`} alt="" loading="lazy" className="max-h-96 w-full rounded-md object-cover" />
          ))}
        </div>
      ) : null}

      <section aria-label="Comments" className="flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-900">
        {comments.map((c) => (
          <Comment key={c.id} comment={c} viewer={viewer} />
        ))}
        <AddComment postId={post.id} />
      </section>
    </li>
  );
}

function Comment({ comment, viewer }: { comment: CommentView; viewer: Viewer }) {
  const [editing, setEditing] = useState(false);
  const isAuthor = comment.author.id === viewer.id;
  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium">{comment.author.name}</span>
        <span className="text-xs text-zinc-500">
          {when(comment.createdAt)}
          {edited(comment) ? " · edited" : ""}
        </span>
        <span className="ml-auto flex items-center gap-3">
          {isAuthor && !editing ? (
            <button type="button" className={linkButton} onClick={() => setEditing(true)}>
              Edit
            </button>
          ) : null}
          {isAuthor || viewer.role === "admin" ? (
            <ConfirmDelete action={deleteCommentAction} hidden={{ commentId: comment.id }} label="Delete this comment?" />
          ) : null}
        </span>
      </div>
      {editing ? (
        <ActionForm action={editCommentAction} onDone={() => setEditing(false)} className="flex gap-2">
          <input type="hidden" name="commentId" value={comment.id} />
          <label className="sr-only" htmlFor={`edit-c-${comment.id}`}>
            Edit comment
          </label>
          <input id={`edit-c-${comment.id}`} name="body" defaultValue={comment.body} required className={inputClass} />
          <button className="text-sm font-medium">Save</button>
          <button type="button" className="text-sm" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </ActionForm>
      ) : (
        <p className="whitespace-pre-wrap">{comment.body}</p>
      )}
    </div>
  );
}

function AddComment({ postId }: { postId: string }) {
  const [key, setKey] = useState(0);
  return (
    <ActionForm key={key} action={addCommentAction} onDone={() => setKey((k) => k + 1)} className="flex gap-2">
      <input type="hidden" name="postId" value={postId} />
      <label className="sr-only" htmlFor={`comment-${postId}`}>
        Write a comment
      </label>
      <input id={`comment-${postId}`} name="body" required placeholder="Write a comment…" className={inputClass} />
      <button className="rounded-md border border-zinc-300 px-3 text-sm font-medium dark:border-zinc-700">Reply</button>
    </ActionForm>
  );
}
