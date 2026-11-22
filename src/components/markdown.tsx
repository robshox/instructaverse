import ReactMarkdown, { type Components } from "react-markdown";

const components: Components = {
  a: ({ href, children }) => {
    const external = typeof href === "string" && /^https?:\/\//.test(href);
    return (
      <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="underline">
        {children}
      </a>
    );
  },
};

/**
 * Renders member- and admin-written Markdown. Raw HTML is never rendered
 * (react-markdown's default) and unsafe URLs such as `javascript:` are
 * stripped by its default URL transform.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-content">
      <ReactMarkdown components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
