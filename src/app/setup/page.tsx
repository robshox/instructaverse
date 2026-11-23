import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { isSetupComplete } from "@/lib/setup";
import { SetupForm } from "./setup-form";

export const metadata = { title: "Set up your community" };

export default function SetupPage() {
  return (
    <AuthShell eyebrow="First run" title="Set up your community." lede="Create the first account. It becomes the admin." headerLink="none">
      <Suspense>
        <SetupGate />
      </Suspense>
    </AuthShell>
  );
}

/** The proxy already 404s /setup once an admin exists; this is a second guard. */
async function SetupGate() {
  await connection();
  if (isSetupComplete()) notFound();
  return <SetupForm />;
}
