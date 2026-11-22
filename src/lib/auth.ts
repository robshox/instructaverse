import { AsyncLocalStorage } from "node:async_hooks";
import { betterAuth } from "better-auth";
import { eq } from "drizzle-orm";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { db } from "@/db";
import { magicLinkEmail, resetPasswordEmail, sendEmail } from "@/lib/email";
import { lazy } from "@/lib/lazy";
import { loginThrottleAfter, loginThrottleBefore } from "@/lib/login-throttle";
import * as schema from "@/db/schema";

/**
 * Set while the first-admin setup flow is creating its account. Before any user
 * exists, sign-up is only allowed inside this context, so the first admin can't
 * be claimed through the public sign-up endpoint.
 */
export const setupContext = new AsyncLocalStorage<true>();

function createAuth() {
  return betterAuth({
  baseURL: process.env.BASE_URL,
  secret: process.env.AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(resetPasswordEmail(user.email, url));
    },
  },
  hooks: {
    before: loginThrottleBefore,
    after: loginThrottleAfter,
  },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "member", input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          const isFirstUser = (await db.$count(schema.user)) === 0;
          if (isFirstUser && !setupContext.getStore()) return false;
          return { data: { ...newUser, role: isFirstUser ? "admin" : "member" } };
        },
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 15 * 60, // AC-2/AC-3: links expire after 15 minutes (and are single-use)
      disableSignUp: true, // accounts come from setup, checkout or migration
      sendMagicLink: async ({ email, url }) => {
        // Only email existing members; the response is the same either way.
        const exists = (await db.$count(schema.user, eq(schema.user.email, email.toLowerCase()))) > 0;
        if (exists) await sendEmail(magicLinkEmail(email, url));
      },
    }),
    // Must stay last so it sees cookies set by other plugins.
    nextCookies(),
  ],
  });
}

/** Better Auth instance, created on first use (secrets aren't available at build time). */
export const auth: ReturnType<typeof createAuth> = lazy(createAuth);

export type Session = typeof auth.$Infer.Session;
