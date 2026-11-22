import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { isSetupComplete } from "@/lib/setup";

/**
 * AC-1: until the first admin exists, every page sends visitors to /setup.
 * Afterwards /setup is gone: it's rewritten to an unmatched path so Next.js
 * serves its not-found page with a real 404 status.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const complete = isSetupComplete();
  if (!complete && !isExempt(pathname)) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }
  if (complete && pathname === "/setup") {
    return NextResponse.rewrite(new URL("/_setup-complete", request.url));
  }
  // Home: members go to their courses, visitors to the plans. Only the cookie's
  // presence is checked here; /courses verifies the session and sends stale
  // cookies on to /login.
  if (pathname === "/") {
    return NextResponse.redirect(new URL(getSessionCookie(request) ? "/courses" : "/pricing", request.url));
  }
  return NextResponse.next();
}

function isExempt(pathname: string) {
  return pathname === "/setup" || pathname === "/healthz" || pathname.startsWith("/api/");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
