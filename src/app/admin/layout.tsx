import { Suspense, type ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { BrandLogo } from "@/components/brand-logo";
import { requireAdmin } from "@/lib/session";

/** Admin shell (FR-3.4): sidebar plus content. The admin gate is unchanged. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar logo={<BrandLogo href="/admin/courses" />} />
      <div className="min-w-0 flex-1 px-12 pt-9 pb-16">
        <div className="max-w-[1040px]">
          <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
            <AdminGate>{children}</AdminGate>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function AdminGate({ children }: { children: ReactNode }) {
  await requireAdmin();
  return children;
}
