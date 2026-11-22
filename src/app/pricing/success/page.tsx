import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Eyebrow } from "@/components/ui";
import { PublicHeader } from "@/components/public-header";
import { getViewer } from "@/lib/session";
import { Finishing } from "./finishing";

export const metadata = { title: "Welcome" };

/** After checkout (FR-8.4). */
export default function SuccessPage({ searchParams }: PageProps<"/pricing/success">) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-7 py-12">
        <div className="w-full max-w-[560px]">
          <Eyebrow accent="Order confirmed" />
          <h1 className="mt-3.5 text-5xl leading-[1.02] font-medium tracking-[-.04em]">Thanks for joining.</h1>
          <Suspense>
            <Status searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

async function Status({ searchParams }: Pick<PageProps<"/pricing/success">, "searchParams">) {
  const { session_id } = await searchParams;
  if (typeof session_id !== "string" || !/^cs_\w+$/.test(session_id)) redirect("/pricing");
  const viewer = await getViewer();
  return <Finishing sessionId={session_id} signedIn={Boolean(viewer)} />;
}
