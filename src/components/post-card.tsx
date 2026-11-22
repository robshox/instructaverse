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
import { Icon } from "@/components/icon";
import { LikeButton } from "@/components/like-button";
import { Markdown } from "@/components/markdown";
import { Avatar, pillClass, Tag } from "@/components/ui";
import type { CommentView } from "@/lib/community/comments";
import type { LikeState } from "@/lib/community/likes";
import type { PostView } from "@/lib/community/posts";

type Viewer = { id: string; role: string };
type Action = (prev: ActionResult, f: FormData) => Promise<ActionResult>;

const linkButton = "font-mono text-xs leading-5 text-muted hover:text-fg";
const when = (d: Date) =>
  new Date(d).toLocaleString("en", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
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
    <details className="text-xs leading-5">
      <summary className="cursor-pointer list-none font-mono text-danger hover:underline [&::-webkit-details-marker]:hidden">Delete</summary>
      <ActionForm action={action} className="mt-2 flex items-center gap-2 text-muted">
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <span>{label}</span>
        <button className={pillClass("danger", "sm")}>Delete</button>
      </ActionForm>
    </details>
  );
}

type Likes = {
  posts: Map<string, LikeState>;
  comments: Map<string, LikeState>;
};
const noLikes: LikeState = { count: 0, liked: false };

export function PostCard({ post, comments, viewer, likes }: { post: PostView; comments: CommentView[]; viewer: Viewer; likes: Likes }) {
  const [editing, setEditing] = useState(false);
  const isAuthor = post.author.id === viewer.id;
  const isAdmin = viewer.role === "admin";

  return (
    <li className={`flex flex-col gap-3.5 rounded-md border bg-surface p-5 ${post.pinned ? "border-[#3a3214]" : "border-line"}`}>
      <header className="flex flex-wrap items-center gap-3">
        <Avatar name={post.author.name} />
        <div>
          <p className="font-medium">
            {post.author.name}
            {post.author.role === "admin" ? <span className="ml-1.5 rounded border border-accent px-1 font-mono text-[11px] text-accent">HOST</span> : null}
          </p>
          <p className="font-mono text-xs text-dim" suppressHydrationWarning>
            {when(post.createdAt)}
            {edited(post) ? " · edited" : ""}
          </p>
        </div>
        <span className="ml-auto flex items-center gap-3.5">
          {post.pinned ? <Tag tone="warn">Pinned</Tag> : null}
          {isAdmin ? (
            <ActionForm action={pinPostAction} className="flex">
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
      </header>

      {editing ? (
        <ActionForm action={editPostAction} onDone={() => setEditing(false)} className="flex flex-col gap-2">
          <input type="hidden" name="postId" value={post.id} />
          <label className="sr-only" htmlFor={`edit-${post.id}`}>
            Edit post
          </label>
          <textarea id={`edit-${post.id}`} name="bodyMd" defaultValue={post.bodyMd} required rows={3} className={inputClass} />
          <div className="flex gap-2">
            <button className={pillClass("primary", "sm")}>Save</button>
            <button type="button" className={pillClass("ghost", "sm")} onClick={() => setEditing(false)}>
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
            <img key={img.id} src={`/media/${img.path}`} alt="" loading="lazy" className="max-h-96 w-full rounded-md border border-line object-cover" />
          ))}
        </div>
      ) : null}

      <footer className="flex gap-5">
        <LikeButton target={{ type: "post", id: post.id }} state={likes.posts.get(post.id) ?? noLikes} />
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted">
          <Icon name="message-square" size={15} />
          {comments.length} {comments.length === 1 ? "reply" : "replies"}
        </span>
      </footer>

      <section aria-label="Comments" className="flex flex-col gap-3.5 border-t border-line pt-3.5">
        {comments.map((c) => (
          <Comment key={c.id} comment={c} viewer={viewer} like={likes.comments.get(c.id) ?? noLikes} />
        ))}
        <AddComment postId={post.id} />
      </section>
    </li>
  );
}

function Comment({ comment, viewer, like }: { comment: CommentView; viewer: Viewer; like: LikeState }) {
  const [editing, setEditing] = useState(false);
  const isAuthor = comment.author.id === viewer.id;
  return (
    <div className="flex gap-3 text-sm">
      <Avatar name={comment.author.name} size={28} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{comment.author.name}</span>
          <span className="font-mono text-xs text-dim" suppressHydrationWarning>
            · {when(comment.createdAt)}
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
            <button className={pillClass("primary", "sm")}>Save</button>
            <button type="button" className={pillClass("ghost", "sm")} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </ActionForm>
        ) : (
          <p className="whitespace-pre-wrap text-[#d6d6d6]">{comment.body}</p>
        )}
        <div>
          <LikeButton target={{ type: "comment", id: comment.id }} state={like} size={13} />
        </div>
      </div>
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
      <input id={`comment-${postId}`} name="body" required placeholder="Write a reply…" className={`${inputClass} py-2`} />
      <button className={pillClass("secondary", "md")}>Reply</button>
    </ActionForm>
  );
}
