import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LogoImage } from "@/components/logo-image";
import { getBrand } from "@/lib/brand";

/** The community logo, read from runtime brand settings (so one image serves any community). */
async function Logo() {
  await connection();
  const brand = getBrand();
  return <LogoImage src={brand.logoUrl} name={brand.name} />;
}

export function BrandLogo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex h-[22px] min-w-[122px] items-center" aria-label="Home">
      <Suspense fallback={null}>
        <Logo />
      </Suspense>
    </Link>
  );
}
