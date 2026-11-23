import Link from "next/link";
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/public-header";

/** Centered signed-out page (FR-8.3): public header, `>` eyebrow, large title, lede, then the form. */
export function AuthShell({
  eyebrow,
  title,
  lede,
  headerLink = "join",
  width = 440,
  children,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  headerLink?: "join" | "login" | "none";
  width?: number;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader>
        {headerLink === "join" ? (
          <Link href="/pricing" className="font-mono text-xs uppercase tracking-[.04em] text-muted hover:text-fg">
            Not a member? <span className="text-fg underline decoration-accent underline-offset-[3px]">Join</span>
          </Link>
        ) : headerLink === "login" ? (
          <Link href="/login" className="font-mono text-xs uppercase tracking-[.04em] text-muted hover:text-fg">
            Remembered it? <span className="text-fg underline decoration-accent underline-offset-[3px]">Sign in</span>
          </Link>
        ) : null}
      </PublicHeader>
      <main className="flex flex-1 items-center justify-center bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,85,0,.08),transparent_70%)] px-7 py-12">
        <div className="w-full" style={{ maxWidth: width }}>
          <p className="font-mono text-xs uppercase tracking-[.04em] text-muted">
            <b className="font-normal text-accent">&gt;</b> {eyebrow}
          </p>
          <h1 className="mt-3.5 text-[44px] leading-[1.02] font-medium tracking-[-.04em]">{title}</h1>
          {lede ? <p className="mt-3 text-muted">{lede}</p> : null}
          <div className="mt-7">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** Amber notice used for expired links and similar. */
export function AuthNotice({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mb-5 rounded-md border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
      {children}
    </p>
  );
}
