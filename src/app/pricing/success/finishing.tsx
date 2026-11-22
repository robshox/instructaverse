"use client";

import { useActionState, useEffect, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { PillLink } from "@/components/ui";
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

  const ready = state === "ready";
  return (
    <>
      <p className="mt-3 text-muted">
        {state === "slow"
          ? "This is taking longer than usual. Your payment went through; your access will appear shortly. You can close this page and sign in later with the email you paid with."
          : ready
            ? "You\u2019re in. Your membership is ready."
            : "Payment received. We\u2019re setting up your membership. This usually takes a few seconds."}
      </p>
      <div role="status" className="mt-7 rounded-md border border-line bg-surface px-5 py-[18px] font-mono text-[13px] leading-loose text-muted">
        <div>
          <span className="text-ok">✓</span> payment received
        </div>
        <div>
          {ready ? (
            <>
              <span className="text-ok">✓</span> access granted
            </>
          ) : (
            <>
              <span className="text-accent">&gt;</span> <span className="text-fg">granting access</span>{" "}
              {state === "waiting" ? <span aria-hidden className="inline-block h-[15px] w-2 animate-pulse bg-accent align-[-2px]" /> : null}
            </>
          )}
        </div>
        <div className={ready ? "" : "text-dim"}>
          {ready ? <span className="text-ok">✓</span> : <span>·</span>} {signedIn ? "you\u2019re signed in" : "sign-in link ready to send"}
        </div>
      </div>
      <div className="mt-6">
        {signedIn ? (
          ready ? (
            <PillLink href="/">Go to the community →</PillLink>
          ) : null
        ) : state === "slow" ? null : (
          <SignInLink sessionId={sessionId} ready={ready} />
        )}
      </div>
    </>
  );
}

function SignInLink({ sessionId, ready }: { sessionId: string; ready: boolean }) {
  const [state, action, pending] = useActionState<LinkState, FormData>(emailSignInLink, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {ready ? <p className="text-muted">We&rsquo;ve set up your account with the email you paid with. Sign in with a link sent to that address.</p> : null}
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton pending={pending || !ready} pendingText={pending ? "Sending…" : "Email me a sign-in link"}>
          Email me a sign-in link
        </SubmitButton>
        {!ready ? <span className="font-mono text-xs text-dim">Ready in a moment…</span> : null}
      </div>
      <FormMessage error={state.error} success={state.sent ? "Sign-in link sent. Check your email." : undefined} />
    </form>
  );
}
