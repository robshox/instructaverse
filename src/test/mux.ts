import { createHmac } from "node:crypto";

/** A Mux webhook request signed the way Mux signs them (or with a wrong secret). */
export function signedMuxRequest(event: unknown, secret = process.env.MUX_WEBHOOK_SECRET!) {
  const body = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return new Request("http://localhost:3000/api/webhooks/mux", {
    method: "POST",
    headers: { "content-type": "application/json", "mux-signature": `t=${t},v1=${v1}` },
    body,
  });
}

export function muxEvent(type: string, data: Record<string, unknown>) {
  return { type, id: crypto.randomUUID(), object: { type: type.split(".")[1], id: data.id }, data, created_at: new Date().toISOString() };
}
