"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icon";

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin/courses", label: "Courses", icon: "graduation-cap" },
  { href: "/admin/boards", label: "Boards", icon: "messages-square" },
  { href: "/admin/events", label: "Events", icon: "calendar" },
  { href: "/admin/plans", label: "Plans", icon: "credit-card" },
  { href: "/admin/groups", label: "Groups", icon: "users" },
];

const linkBase = "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors";

function Items({ path }: { path: string | null }) {
  return (
    <nav aria-label="Admin" className="flex flex-col gap-0.5">
      {items.map((i) => {
        const on = path !== null && (path === i.href || path.startsWith(`${i.href}/`));
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={on ? "page" : undefined}
            className={`${linkBase} ${on ? "bg-raised text-fg shadow-[inset_2px_0_0_var(--color-accent)]" : "text-muted hover:bg-raised hover:text-fg"}`}
          >
            <Icon name={i.icon} className={on ? "text-accent" : undefined} />
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ActiveItems() {
  return <Items path={usePathname()} />;
}

/** Admin sidebar (spec FR-3.4). The logo is rendered on the server and passed in. */
export function AdminSidebar({ logo }: { logo: ReactNode }) {
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col gap-1.5 border-r border-line bg-[#0e0e0e] px-3.5 py-5">
      <div className="mx-2 mb-5">{logo}</div>
      <p className="px-2.5 pb-1.5 font-mono text-[11px] uppercase tracking-[.06em] text-dim">Admin</p>
      <Suspense fallback={<Items path={null} />}>
        <ActiveItems />
      </Suspense>
      <Link href="/courses" className={`${linkBase} mt-auto text-muted hover:bg-raised hover:text-fg`}>
        <Icon name="arrow-up-right" />
        View site
      </Link>
    </aside>
  );
}
