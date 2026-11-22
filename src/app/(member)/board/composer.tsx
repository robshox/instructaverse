"use client";

import { useActionState, useState } from "react";
import { FormMessage, inputClass, SubmitButton } from "@/components/form";
import { createPostAction, type PostFormState } from "./actions";

const MAX_IMAGES = 4;
const MAX_BYTES = 10 * 1024 * 1024;

/** New post: Markdown text plus up to 4 images. The server re-checks everything (AC-23). */
export function Composer({ boardId }: { boardId: string }) {
  const [state, action, pending] = useActionState<PostFormState, FormData>(createPostAction, {});
  const [fileError, setFileError] = useState<string>();

  function checkFiles(files: FileList | null) {
    const list = [...(files ?? [])];
    if (list.length > MAX_IMAGES) return setFileError(`You can attach up to ${MAX_IMAGES} images`);
    const big = list.find((f) => f.size > MAX_BYTES);
    setFileError(big ? `“${big.name}” is over 10 MB` : undefined);
  }

  return (
    <form action={action} key={state.ok} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <input type="hidden" name="boardId" value={boardId} />
      <label className="sr-only" htmlFor="post-body">
        Write a post
      </label>
      <textarea id="post-body" name="bodyMd" required rows={3} placeholder="Share something with the community…" className={inputClass} />
      <label className="flex flex-col gap-1 text-sm">
        Images (up to 4, 10 MB each)
        <input
          type="file"
          name="images"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => checkFiles(e.target.files)}
        />
      </label>
      <FormMessage error={fileError ?? state.error} />
      <SubmitButton pending={pending || Boolean(fileError)} pendingText={pending ? "Posting…" : "Post"}>
        Post
      </SubmitButton>
    </form>
  );
}
