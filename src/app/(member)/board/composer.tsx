"use client";

import { useActionState, useState } from "react";
import { FormMessage, inputClass, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { createPostAction, type PostFormState } from "./actions";

const MAX_IMAGES = 4;
const MAX_BYTES = 10 * 1024 * 1024;

/** New post: Markdown text plus up to 4 images. The server re-checks everything (AC-23). */
export function Composer({ boardId }: { boardId: string }) {
  const [state, action, pending] = useActionState<PostFormState, FormData>(createPostAction, {});
  const [fileError, setFileError] = useState<string>();
  const [chosen, setChosen] = useState(0);

  function checkFiles(files: FileList | null) {
    const list = [...(files ?? [])];
    setChosen(list.length);
    if (list.length > MAX_IMAGES) return setFileError(`You can attach up to ${MAX_IMAGES} images`);
    const big = list.find((f) => f.size > MAX_BYTES);
    setFileError(big ? `“${big.name}” is over 10 MB` : undefined);
  }

  return (
    <form action={action} key={state.ok} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
      <input type="hidden" name="boardId" value={boardId} />
      <label className="sr-only" htmlFor="post-body">
        Write a post
      </label>
      <textarea id="post-body" name="bodyMd" required rows={3} placeholder="Share something with the community…" className={`${inputClass} resize-y`} />
      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-xs text-muted hover:text-fg has-focus-visible:outline-2 has-focus-visible:outline-accent">
          <Icon name="image" size={16} />
          {chosen ? `${chosen} ${chosen === 1 ? "image" : "images"} chosen` : "Add images"}
          <input
            type="file"
            name="images"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => checkFiles(e.target.files)}
            className="sr-only"
          />
        </label>
        <span className="font-mono text-xs text-dim">Up to 4 · 10 MB each · Markdown supported</span>
        <span className="ml-auto">
          <SubmitButton pending={pending || Boolean(fileError)} pendingText={pending ? "Posting…" : "Post"}>
            Post
          </SubmitButton>
        </span>
      </div>
      {fileError ?? state.error ? <FormMessage error={fileError ?? state.error} /> : null}
    </form>
  );
}
