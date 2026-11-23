import { describe, expect, it } from "vitest";
import { lessonPosition } from "@/lib/courses/lesson-view";
import { vttCues } from "@/lib/mux/vtt";

const outline = {
  modules: [
    { id: "m1", title: "One", lessons: [{ id: "a", title: "A" }, { id: "b", title: "B" }] },
    { id: "m2", title: "Empty", lessons: [] },
    { id: "m3", title: "Three", lessons: [{ id: "c", title: "C" }] },
  ],
};

describe("lesson position in outline order (AC-14)", () => {
  it("gives module and lesson numbers and the next lesson, crossing modules", () => {
    expect(lessonPosition(outline, "a")).toMatchObject({ moduleNumber: 1, lessonNumber: 1, moduleTitle: "One", next: { id: "b" } });
    expect(lessonPosition(outline, "b")).toMatchObject({ moduleNumber: 1, lessonNumber: 2, next: { id: "c" } });
    expect(lessonPosition(outline, "c")).toMatchObject({ moduleNumber: 3, lessonNumber: 1, next: null });
    expect(lessonPosition(outline, "zzz")).toBeNull();
  });
});

describe("WebVTT cues (AC-16)", () => {
  it("returns each cue's start as mm:ss with its text, without tags, ids or notes", () => {
    const vtt =
      "WEBVTT\n\nNOTE a note\n\n1\n00:00:00.000 --> 00:00:02.000\nHi <b>everyone</b>,\n\n2\n00:01:05.500 --> 00:01:09.000\nwelcome\nto the course.\n\n01:02:03.000 --> 01:02:04.000\nLater\n";
    expect(vttCues(vtt)).toEqual([
      { start: "00:00", seconds: 0, text: "Hi everyone," },
      { start: "01:05", seconds: 65, text: "welcome to the course." },
      { start: "62:03", seconds: 3723, text: "Later" },
    ]);
  });
  it("accepts short mm:ss.mmm timings and CRLF", () => {
    expect(vttCues("WEBVTT\r\n\r\n00:07.250 --> 00:09.000\r\nShort form\r\n")).toEqual([{ start: "00:07", seconds: 7, text: "Short form" }]);
  });
});
