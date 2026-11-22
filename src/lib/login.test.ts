import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { migrateDb } from "@/db";
import { auth } from "@/lib/auth";
import { outbox } from "@/lib/email";
import { resetLoginThrottle } from "@/lib/login-throttle";
import { createFirstAdmin } from "@/lib/setup";

const BASE = "http://localhost:3000";
const member = { name: "Ada", email: "ada@example.com", password: "first-password-1" };

function post(path: string, body: unknown, ip = "203.0.113.7") {
  return auth.handler(
    new Request(`${BASE}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE, "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

const get = (url: string) => auth.handler(new Request(url, { headers: { origin: BASE } }));

async function requestMagicLink(email: string) {
  const res = await post("/sign-in/magic-link", { email, callbackURL: "/", errorCallbackURL: "/login" });
  expect(res.status).toBe(200);
  return outbox.at(-1);
}

function linkIn(mail: { text: string } | undefined) {
  const url = mail?.text.match(/https?:\/\/\S+/)?.[0];
  if (!url) throw new Error("no link in email");
  return url;
}

beforeAll(async () => {
  migrateDb();
  await createFirstAdmin(member);
});

beforeEach(() => {
  outbox.length = 0;
  resetLoginThrottle();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("magic link (AC-2, AC-3)", () => {
  it("emails a link that logs the member in", async () => {
    const mail = await requestMagicLink(member.email);
    expect(mail?.to).toBe(member.email);

    const res = await get(linkIn(mail));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`${BASE}/`);
    expect(res.headers.get("set-cookie")).toMatch(/session_token=/);
  });

  it("is single-use: opening the same link again fails", async () => {
    const link = linkIn(await requestMagicLink(member.email));
    await get(link);
    const again = await get(link);
    expect(again.headers.get("location")).toBe(`${BASE}/login?error=INVALID_TOKEN`);
    expect(again.headers.get("set-cookie") ?? "").not.toMatch(/session_token=[^;]/);
  });

  it("works within 15 minutes", async () => {
    const link = linkIn(await requestMagicLink(member.email));
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 14 * 60_000 });
    expect((await get(link)).headers.get("location")).toBe(`${BASE}/`);
  });

  it("fails after 15 minutes and sends the member back to login to ask for a new one", async () => {
    const link = linkIn(await requestMagicLink(member.email));
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 16 * 60_000 });
    expect((await get(link)).headers.get("location")).toBe(`${BASE}/login?error=INVALID_TOKEN`);
  });

  it("doesn't email unknown addresses, and doesn't reveal that they're unknown", async () => {
    const res = await post("/sign-in/magic-link", { email: "nobody@example.com", callbackURL: "/" });
    expect(res.status).toBe(200);
    expect(outbox).toHaveLength(0);
  });
});

describe("password login and rate limiting (AC-4)", () => {
  const signIn = (password: string, ip?: string) => post("/sign-in/email", { email: member.email, password }, ip);

  it("logs in with the correct password", async () => {
    const res = await signIn(member.password);
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/session_token=/);
  });

  it("limits further attempts after 5 failures in 15 minutes for that email and IP", async () => {
    for (let i = 0; i < 5; i++) expect((await signIn("wrong-password")).status).toBe(401);
    expect((await signIn(member.password)).status).toBe(429);
    // A different IP is not affected.
    expect((await signIn(member.password, "198.51.100.9")).status).toBe(200);
  });

  it("lifts the limit once 15 minutes have passed", async () => {
    for (let i = 0; i < 5; i++) await signIn("wrong-password");
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 15 * 60_000 + 1000 });
    expect((await signIn(member.password)).status).toBe(200);
  });

  it("4 failures then a success resets the count", async () => {
    for (let i = 0; i < 4; i++) await signIn("wrong-password");
    expect((await signIn(member.password)).status).toBe(200);
    for (let i = 0; i < 4; i++) await signIn("wrong-password");
    expect((await signIn(member.password)).status).toBe(200);
  });
});

describe("rate limiting through server-side calls (the login page's server action)", () => {
  const signIn = (password: string) =>
    auth.api.signInEmail({
      body: { email: member.email, password },
      headers: new Headers({ "x-forwarded-for": "203.0.113.50" }),
    });

  it("also limits after 5 failures", async () => {
    for (let i = 0; i < 5; i++) await expect(signIn("wrong-password")).rejects.toMatchObject({ statusCode: 401 });
    await expect(signIn(member.password)).rejects.toMatchObject({ statusCode: 429 });
  });
});

describe("password reset (FR-1.2)", () => {
  it("emails a reset link and accepts a new password", async () => {
    const res = await post("/request-password-reset", { email: member.email, redirectTo: "/reset" });
    expect(res.status).toBe(200);
    const link = linkIn(outbox.at(-1));

    // The emailed link redirects to /reset with the token attached.
    const redirect = await get(link);
    const token = new URL(redirect.headers.get("location")!).searchParams.get("token");
    expect(token).toBeTruthy();

    const reset = await post("/reset-password", { token, newPassword: "second-password-2" });
    expect(reset.status).toBe(200);
    expect((await post("/sign-in/email", { email: member.email, password: "second-password-2" })).status).toBe(200);
    expect((await post("/sign-in/email", { email: member.email, password: member.password })).status).toBe(401);
  });
});
