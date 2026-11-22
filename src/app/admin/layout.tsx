import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { requireAdmin } from "@/lib/session";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6">
      <nav className="flex items-center gap-4 border-b border-zinc-200 pb-4 text-sm dark:border-zinc-800">
        <span className="font-semibold">Admin</span>
        <Link href="/admin/groups" className="underline-offset-4 hover:underline">
          Groups
        </Link>
      </nav>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <AdminGate>{children}</AdminGate>
      </Suspense>
    </div>
  );
}

async function AdminGate({ children }: { children: ReactNode }) {
  await requireAdmin();
  return children;
}
