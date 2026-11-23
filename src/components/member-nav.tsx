"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

const links = [
  { href: "/courses", label: "Courses" },
  { href: "/board", label: "Board" },
  { href: "/events", label: "Events" },
];

function NavLinks({ path }: { path: string | null }) {
  const active = (href: string) => path !== null && (path === href || path.startsWith(`${href}/`));
  return (
    <>
      <nav aria-label="Main" className="flex h-full gap-7 font-mono text-xs uppercase tracking-[.04em]">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active(l.href) ? "page" : undefined}
            className={`flex items-center border-b-2 pt-0.5 ${
              active(l.href) ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <Link
        href="/account"
        aria-current={active("/account") ? "page" : undefined}
        className={`ml-auto rounded-full border border-accent px-3.5 py-[7px] font-mono text-xs uppercase tracking-[.04em] transition-colors ${
          active("/account") ? "bg-accent text-on-accent" : "text-fg hover:bg-accent hover:text-on-accent"
        }`}
      >
        Account
      </Link>
    </>
  );
}

function ActiveNavLinks() {
  return <NavLinks path={usePathname()} />;
}

/** Member top nav (spec FR-3.1). The logo is rendered on the server and passed in. */
export function MemberNav({ logo }: { logo: ReactNode }) {
  return (
    <header className="h-14 border-b border-line">
      <div className="mx-auto flex h-full w-full max-w-[1120px] items-center gap-10 px-7">
        {logo}
        {/* The path is request data; the fallback is the same nav without the active marker. */}
        <Suspense fallback={<NavLinks path={null} />}>
          <ActiveNavLinks />
        </Suspense>
      </div>
    </header>
  );
}
