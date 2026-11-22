import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getViewer } from "@/lib/session";
import { Finishing } from "./finishing";

export const metadata = { title: "Welcome" };

export default function SuccessPage({ searchParams }: PageProps<"/pricing/success">) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Thanks for joining</h1>
      <Suspense>
        <Status searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Status({ searchParams }: Pick<PageProps<"/pricing/success">, "searchParams">) {
  const { session_id } = await searchParams;
  if (typeof session_id !== "string" || !/^cs_\w+$/.test(session_id)) redirect("/pricing");
  const viewer = await getViewer();
  return <Finishing sessionId={session_id} signedIn={Boolean(viewer)} />;
}
