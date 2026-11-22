import { connection } from "next/server";

/** Liveness check for Docker and reverse proxies. Always evaluated at request time. */
export async function GET() {
  await connection();
  return Response.json({ status: "ok" });
}
