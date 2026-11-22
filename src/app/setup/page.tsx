import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { isSetupComplete } from "@/lib/setup";
import { SetupForm } from "./setup-form";

export const metadata = { title: "Set up your community" };

export default function SetupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Set up your community</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Create the first account. It becomes the admin.
        </p>
      </div>
      <Suspense>
        <SetupGate />
      </Suspense>
    </main>
  );
}

/** The proxy already 404s /setup once an admin exists; this is a second guard. */
async function SetupGate() {
  await connection();
  if (isSetupComplete()) notFound();
  return <SetupForm />;
}
