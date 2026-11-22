import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import { db, migrateDb } from "@/db";
import { user } from "@/db/schema";
import { proxy } from "@/proxy";

beforeAll(async () => {
  migrateDb();
  await db.insert(user).values({ id: "admin", name: "Admin", email: "admin@example.com", role: "admin" });
});

const at = (path: string, cookie?: string) =>
  proxy(new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie } : {} }));

describe("home page routing", () => {
  it("sends signed-out visitors from / to the pricing page", async () => {
    const res = await at("/");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/pricing");
  });

  it("sends signed-in members from / to their courses", async () => {
    for (const cookie of ["better-auth.session_token=abc", "__Secure-better-auth.session_token=abc"]) {
      expect((await at("/", cookie)).headers.get("location")).toBe("http://localhost:3000/courses");
    }
  });

  it("leaves other pages alone", async () => {
    expect((await at("/courses")).headers.get("location")).toBeNull();
  });
});
