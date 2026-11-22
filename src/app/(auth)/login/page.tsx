import { Suspense } from "react";
import { LoginForms } from "./login-forms";

export const metadata = { title: "Sign in" };

const errors: Record<string, string> = {
  INVALID_TOKEN: "That sign-in link has expired or was already used. Enter your email to get a new one.",
  new_user_signup_disabled: "There's no account for that email.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <Suspense>
        <LinkError searchParams={searchParams} />
      </Suspense>
      <LoginForms />
    </main>
  );
}

async function LinkError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? (errors[error] ?? "Something went wrong. Please try again.") : null;
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
      {message}
    </p>
  );
}
