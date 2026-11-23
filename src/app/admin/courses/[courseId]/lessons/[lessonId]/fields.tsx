"use client";

import { useState } from "react";
import { Markdown } from "@/components/markdown";

/**
 * Markdown with Write and Preview tabs (FR-9.4, AC-30). Preview renders the
 * current text with the members' Markdown component; nothing is saved until
 * the form is submitted. The textarea stays mounted so its value submits.
 */
export function MarkdownField({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const tabClass = (on: boolean) =>
    `border-b-2 px-3 py-2 font-mono text-xs tracking-[.04em] uppercase ${on ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`;

  return (
    <section className="overflow-hidden rounded-md border border-line bg-surface">
      <div role="tablist" aria-label="Lesson text" className="flex items-center gap-1 border-b border-line px-3">
        <button type="button" role="tab" aria-selected={tab === "write"} onClick={() => setTab("write")} className={tabClass(tab === "write")}>
          Write
        </button>
        <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")} className={tabClass(tab === "preview")}>
          Preview
        </button>
        <span className="ml-auto font-mono text-xs text-dim">Markdown</span>
      </div>
      <label className="sr-only" htmlFor="lesson-body">
        Lesson text (Markdown)
      </label>
      <textarea
        id="lesson-body"
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={12}
        hidden={tab === "preview"}
        className="block w-full resize-y bg-transparent px-[18px] py-4 font-mono text-[13px] leading-[1.7] text-[#d6d6d6] outline-none"
      />
      {tab === "preview" ? (
        <div role="tabpanel" aria-label="Preview" className="min-h-[200px] px-[18px] py-4">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-sm text-dim">Nothing to preview yet.</p>}
        </div>
      ) : null}
    </section>
  );
}

/** Transcript with a live "WebVTT · used as captions" tag (FR-9.4). */
export function TranscriptField({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const vtt = value.trimStart().startsWith("WEBVTT");
  return (
    <section className="rounded-md border border-line bg-surface px-5 py-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="lesson-transcript" className="font-mono text-xs tracking-[.04em] text-accent uppercase">
          Transcript
        </label>
        {vtt ? (
          <span className="rounded-full border border-ok/40 px-2.5 py-0.5 font-mono text-[11px] tracking-[.04em] text-ok">WEBVTT · USED AS CAPTIONS</span>
        ) : value.trim() ? (
          <span className="rounded-full border border-line-strong px-2.5 py-0.5 font-mono text-[11px] tracking-[.04em] text-muted">PLAIN TEXT</span>
        ) : null}
      </div>
      <textarea
        id="lesson-transcript"
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={6}
        className="mt-3 block w-full resize-y rounded-md border border-line-strong bg-raised px-3 py-2.5 font-mono text-xs leading-[1.7] text-muted outline-none focus:border-accent"
      />
      <p className="mt-2 font-mono text-[11px] text-dim">Plain text, or WebVTT (starting with WEBVTT) to also show it as captions.</p>
    </section>
  );
}
