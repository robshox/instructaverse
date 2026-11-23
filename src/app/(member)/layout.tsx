import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { MemberNav } from "@/components/member-nav";

/** Member area shell (FR-3.1–3.3): branded nav and a fixed-width column that never shrinks to its content. */
export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MemberNav logo={<BrandLogo href="/courses" />} />
      <div className="mx-auto w-full max-w-[1120px] flex-1 px-7 pt-11 pb-18">{children}</div>
    </>
  );
}
