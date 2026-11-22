import { Suspense } from "react";
import { AuthNotice, AuthShell } from "@/components/auth-shell";
import { NewPasswordForm, RequestResetForm } from "./reset-forms";

export const metadata = { title: "Reset your password" };

export default function ResetPage({ searchParams }: PageProps<"/reset">) {
  return (
    <AuthShell eyebrow="Reset password" title="Reset your password." headerLink="login">
      <Suspense>
        <ResetStep searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function ResetStep({ searchParams }: Pick<PageProps<"/reset">, "searchParams">) {
  const { token, error } = await searchParams;
  if (typeof token === "string" && token) return <NewPasswordForm token={token} />;
  return (
    <>
      {error ? <AuthNotice>That reset link has expired or was already used. Request a new one below.</AuthNotice> : null}
      <p className="mb-5 text-muted">Enter your email and we&rsquo;ll send you a link to choose a new password.</p>
      <RequestResetForm />
    </>
  );
}
