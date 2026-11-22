import { Suspense } from "react";
import { AuthNotice, AuthShell } from "@/components/auth-shell";
import { LoginForms } from "./login-forms";

export const metadata = { title: "Sign in" };

const errors: Record<string, string> = {
  INVALID_TOKEN: "That sign-in link has expired or was already used. Enter your email to get a new one.",
  new_user_signup_disabled: "There's no account for that email.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell eyebrow="Member login" title="Welcome back." lede="We'll email you a link that signs you in. It works once and expires in 15 minutes.">
      <Suspense>
        <LinkError searchParams={searchParams} />
      </Suspense>
      <LoginForms />
    </AuthShell>
  );
}

async function LinkError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? (errors[error] ?? "Something went wrong. Please try again.") : null;
  if (!message) return null;
  return <AuthNotice>{message}</AuthNotice>;
}
