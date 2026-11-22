import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/components/markdown";

const html = (md: string) => renderToStaticMarkup(<Markdown>{md}</Markdown>);

describe("Markdown", () => {
  it("renders headings, emphasis, lists and links", () => {
    const out = html("## Setup\n\nInstall **Node** and *npm*.\n\n- one\n- two\n\n[Docs](https://example.com)");
    expect(out).toContain("<h2>Setup</h2>");
    expect(out).toContain("<strong>Node</strong>");
    expect(out).toContain("<li>one</li>");
    expect(out).toMatch(/<a href="https:\/\/example.com"[^>]*>Docs<\/a>/);
  });

  it("opens external links in a new tab safely", () => {
    expect(html("[x](https://example.com)")).toMatch(/target="_blank" rel="noopener noreferrer"/);
  });

  it("never renders raw HTML (no script or event-handler injection)", () => {
    const out = html('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("<img");
  });

  it("neutralises javascript: links", () => {
    expect(html("[click](javascript:alert(1))")).not.toContain("javascript:");
  });
});
