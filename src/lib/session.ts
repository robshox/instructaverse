import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type Viewer = { id: string; name: string; email: string; role: string };

/** The signed-in user for this request, or null. */
export async function getViewer(): Promise<Viewer | null> {
  // Await headers() first: during prerendering it defers the render, so auth
  // (which needs runtime secrets) is never initialised at build time.
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const { id, name, email, role } = session.user as typeof session.user & { role: string };
  return { id, name, email, role };
}

/**
 * Guard for admin pages and admin server actions (server actions are public
 * endpoints, so each one must call this itself). Signed-out visitors go to
 * login; members get a 404 so admin URLs aren't advertised.
 */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "admin") notFound();
  return viewer;
}
