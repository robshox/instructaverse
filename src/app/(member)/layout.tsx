import Link from "next/link";
import type { ReactNode } from "react";

export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-6">
      <nav className="flex items-center gap-4 border-b border-zinc-200 pb-4 text-sm dark:border-zinc-800">
        <Link href="/courses" className="font-semibold">
          Courses
        </Link>
        <Link href="/board" className="underline-offset-4 hover:underline">
          Board
        </Link>
        <Link href="/account" className="ml-auto underline-offset-4 hover:underline">
          Account
        </Link>
      </nav>
      {children}
    </div>
  );
}
