"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { ProgressBar } from "@/components/ui";
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

/** Upload a video file straight to Mux (the server only creates the upload URL). Drop a file or browse. */
export function VideoUpload({ lessonId, start }: { lessonId: string; start: (lessonId: string) => Promise<{ uploadUrl?: string; error?: string }> }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [over, setOver] = useState(false);
  const busy = progress !== null;

  async function upload(file: File) {
    if (!file.type.startsWith("video/")) return setMessage({ error: "That isn't a video file." });
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
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file && !busy) upload(file);
        }}
        className={`flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-3 text-center transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent ${
          over ? "border-accent bg-accent/10" : "border-line-strong bg-raised hover:border-muted"
        } ${busy ? "cursor-progress opacity-70" : ""}`}
      >
        <span className="text-accent">
          <Icon name="upload" size={22} />
        </span>
        <span className="text-sm">
          {busy ? (
            `Uploading… ${progress}%`
          ) : (
            <>
              Drop a video or <span className="underline decoration-accent underline-offset-[3px]">browse</span>
            </>
          )}
        </span>
        <span className="font-mono text-[11px] text-dim">MP4 / MOV · uploads straight to Mux</span>
        <input type="file" accept="video/*" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="sr-only" />
      </label>
      {busy ? <ProgressBar value={progress} max={100} label="Upload progress" /> : null}
      <FormMessage error={message.error} success={message.success} />
    </div>
  );
}
