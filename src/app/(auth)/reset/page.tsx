import { Suspense } from "react";
import { NewPasswordForm, RequestResetForm } from "./reset-forms";

export const metadata = { title: "Reset your password" };

export default function ResetPage({ searchParams }: PageProps<"/reset">) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <Suspense>
        <ResetStep searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ResetStep({ searchParams }: Pick<PageProps<"/reset">, "searchParams">) {
  const { token, error } = await searchParams;
  if (typeof token === "string" && token) return <NewPasswordForm token={token} />;
  return (
    <>
      {error ? (
        <p role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          That reset link has expired or was already used. Request a new one below.
        </p>
      ) : null}
      <RequestResetForm />
    </>
  );
}
