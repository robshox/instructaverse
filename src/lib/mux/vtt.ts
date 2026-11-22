// WebVTT cue parsing for the timestamped transcript (AC-16). Pure and client-safe.

export type Cue = { start: string; seconds: number; text: string };

function toSeconds(stamp: string): number {
  const parts = stamp.trim().split(":").map(Number);
  return Math.floor(parts.reduce((total, part) => total * 60 + part, 0));
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Each cue's start (mm:ss, minutes may exceed 59) and its text with tags removed. Skips the header, NOTE, STYLE and REGION blocks. */
export function vttCues(vtt: string): Cue[] {
  const blocks = vtt.replace(/\r\n?/g, "\n").split(/\n{2,}/).slice(1);
  const cues: Cue[] = [];
  for (const block of blocks) {
    if (/^(NOTE|STYLE|REGION)\b/.test(block)) continue;
    const lines = block.split("\n");
    const timing = lines.findIndex((l) => l.includes("-->"));
    if (timing === -1) continue;
    const text = lines
      .slice(timing + 1)
      .map((l) => l.replace(/<[^>]+>/g, "").trim())
      .filter(Boolean)
      .join(" ");
    if (!text) continue;
    const seconds = toSeconds(lines[timing]!.split("-->")[0]!);
    cues.push({ start: mmss(seconds), seconds, text });
  }
  return cues;
}
