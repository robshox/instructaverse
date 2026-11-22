import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getBrand } from "@/lib/brand";

/** The community logo, read from runtime brand settings (so one image serves any community). */
async function Logo() {
  await connection();
  const brand = getBrand();
  return (
    // External, admin-configured URL; next/image would need every possible host allow-listed.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={brand.logoUrl} alt={brand.name} className="block h-[22px] w-auto max-w-[180px]" />
  );
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
