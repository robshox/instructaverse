"use client";

import { useState } from "react";

/** The brand logo, or the brand name as text if the image can't load (spec edge case). */
export function LogoImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="text-[15px] font-semibold tracking-[-.02em] whitespace-nowrap">{name}</span>;
  return (
    // External, admin-configured URL; next/image would need every possible host allow-listed.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      // The image may fail before hydration, when onError has no listener yet.
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) setFailed(true);
      }}
      className="block h-[22px] w-auto max-w-[180px]"
    />
  );
}
