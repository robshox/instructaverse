import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter_Tight } from "next/font/google";
import { connection } from "next/server";
import { Suspense } from "react";
import { getBrand } from "@/lib/brand";
import "./globals.css";

const sans = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

/** Brand comes from runtime env (one image serves any community), so metadata is resolved per request. */
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const brand = getBrand();
  return { title: { default: brand.name, template: `%s · ${brand.name}` }, description: brand.tagline };
}

async function Connection() {
  await connection();
  return null;
}

/** Marks the intentional request-time metadata, without blocking the static shell. */
function DynamicMarker() {
  return (
    <Suspense>
      <Connection />
    </Suspense>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas font-sans text-fg">
        {children}
        <DynamicMarker />
      </body>
    </html>
  );
}
