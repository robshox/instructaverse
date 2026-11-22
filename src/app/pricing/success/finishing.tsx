"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { emailSignInLink, type LinkState } from "./actions";

const POLL_MS = 1500;
const GIVE_UP_MS = 90_000;

/** Waits for the checkout webhook to land, then shows the next step. */
export function Finishing({ sessionId, signedIn }: { sessionId: string; signedIn: boolean }) {
  const [state, setState] = useState<"waiting" | "ready" | "slow">("waiting");

  useEffect(() => {
    let stopped = false;
    const started = Date.now();
    async function poll() {
      while (!stopped) {
        const res = await fetch(`/pricing/success/status?session_id=${encodeURIComponent(sessionId)}`).catch(() => null);
        if ((await res?.json().catch(() => null))?.ready) return setState("ready");
        if (Date.now() - started > GIVE_UP_MS) return setState("slow");
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
    }
    poll();
    return () => {
      stopped = true;
    };
  }, [sessionId]);

  if (state === "waiting") {
    return (
      <p role="status" className="text-zinc-600 dark:text-zinc-400">
        Payment received. Finishing setting up your membership…
      </p>
    );
  }
  if (state === "slow") {
    return (
      <p role="status" className="text-zinc-600 dark:text-zinc-400">
        This is taking longer than usual. Your payment went through; your access will appear shortly. You can close
        this page and sign in later with the email you paid with.
      </p>
    );
  }
  return signedIn ? (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-medium">You&rsquo;re in.</p>
      <Link href="/" className="underline">
        Go to the community
      </Link>
    </div>
  ) : (
    <SignInLink sessionId={sessionId} />
  );
}

function SignInLink({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState<LinkState, FormData>(emailSignInLink, {});
  return (
    <form action={action} className="flex max-w-sm flex-col gap-4">
      <p className="text-lg font-medium">You&rsquo;re in.</p>
      <p className="text-zinc-600 dark:text-zinc-400">
        We&rsquo;ve set up your account with the email you paid with. Sign in with a link sent to that address.
      </p>
      <input type="hidden" name="sessionId" value={sessionId} />
      <FormMessage error={state.error} success={state.sent ? "Sign-in link sent. Check your email." : undefined} />
      <SubmitButton pending={pending} pendingText="Sending…">
        Email me a sign-in link
      </SubmitButton>
    </form>
  );
}
