"use client";

import { useActionState, useState } from "react";
import { FormMessage, inputClass, SubmitButton } from "@/components/form";
import type { EditorState } from "./actions";

type Action = (prev: EditorState, formData: FormData) => Promise<EditorState>;

/**
 * A form wired to an editor action: shows its error, and with `resetOnSuccess`
 * remounts (clears) after each successful submit.
 */
export function EditorForm({
  action,
  children,
  submit,
  resetOnSuccess,
  className = "flex flex-col gap-4",
  size,
}: {
  action: Action;
  children: React.ReactNode;
  submit: string;
  resetOnSuccess?: boolean;
  className?: string;
  size?: "md" | "sm";
}) {
  const [state, formAction, pending] = useActionState<EditorState, FormData>(action, {});
  return (
    <form action={formAction} key={resetOnSuccess ? state.ok : undefined} className={className}>
      {children}
      <span className="shrink-0">
        <SubmitButton pending={pending} pendingText="Saving…" size={size}>
          {submit}
        </SubmitButton>
      </span>
      <FormMessage error={state.error} success={!resetOnSuccess && state.ok ? "Saved." : undefined} />
    </form>
  );
}

/** Upload a video file straight to Mux (the server only creates the upload URL). */
export function VideoUpload({ lessonId, start }: { lessonId: string; start: (lessonId: string) => Promise<{ uploadUrl?: string; error?: string }> }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});

  async function upload(file: File) {
    setMessage({});
    const { uploadUrl, error } = await start(lessonId);
    if (!uploadUrl) return setMessage({ error });
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      setMessage(
        xhr.status < 300
          ? { success: "Uploaded. Mux is processing the video; this page shows it as ready once it's done (refresh in a minute)." }
          : { error: "Upload failed. Please try again." },
      );
    };
    xhr.onerror = () => {
      setProgress(null);
      setMessage({ error: "Upload failed. Please try again." });
    };
    xhr.open("PUT", uploadUrl);
    xhr.send(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Upload a video
        <input
          type="file"
          accept="video/*"
          disabled={progress !== null}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          className={inputClass}
        />
      </label>
      {progress !== null ? <progress value={progress} max={100} aria-label="Upload progress" className="w-full" /> : null}
      <FormMessage error={message.error} success={message.success} />
    </div>
  );
}
