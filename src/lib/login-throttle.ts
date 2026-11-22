import { APIError, createAuthMiddleware, getIP } from "better-auth/api";

/**
 * AC-4: after 5 failed password attempts within 15 minutes for the same
 * email and IP, further attempts get 429 until the window passes.
 * Kept in memory: the app runs as a single process.
 */
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;
const SIGN_IN_PATH = "/sign-in/email";

const failures = new Map<string, number[]>();

function recent(key: string, now: number) {
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list;
}

type HookCtx = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

function keyFor(ctx: HookCtx): string | null {
  const email = (ctx.body as { email?: unknown } | undefined)?.email;
  if (typeof email !== "string") return null;
  // HTTP calls carry a Request; server-action calls pass the incoming headers.
  const source = ctx.request ?? ctx.headers;
  const ip = source ? getIP(source, ctx.context.options) : null;
  return `${email.trim().toLowerCase()}|${ip ?? "unknown"}`;
}

export const loginThrottleBefore = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== SIGN_IN_PATH) return;
  const key = keyFor(ctx);
  if (key && recent(key, Date.now()).length >= MAX_FAILURES) {
    throw new APIError("TOO_MANY_REQUESTS", {
      message: "Too many failed attempts. Try again in 15 minutes, or sign in with an email link.",
    });
  }
});

export const loginThrottleAfter = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== SIGN_IN_PATH) return;
  const key = keyFor(ctx);
  if (!key) return;
  const returned = ctx.context.returned;
  if (returned instanceof APIError && returned.statusCode === 401) {
    failures.set(key, [...recent(key, Date.now()), Date.now()]);
  } else if (!(returned instanceof Error)) {
    failures.delete(key);
  }
});

/** Test helper. */
export function resetLoginThrottle() {
  failures.clear();
}
