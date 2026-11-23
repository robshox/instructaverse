import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";

/** Slim header for signed-out pages (FR-3.5): logo plus one contextual link. */
export function PublicHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="h-14 border-b border-line">
      <div className="mx-auto flex h-full w-full max-w-[1120px] items-center justify-between px-7">
        <BrandLogo />
        {children}
      </div>
    </header>
  );
}
