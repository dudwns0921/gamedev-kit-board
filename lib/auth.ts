import { timingSafeEqual } from "node:crypto";

// The kit sends boards with a token; the browser is guarded in lib/guard.ts.

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** The kit's requests: `Authorization: Bearer <INGEST_TOKEN>`. */
export function ingestOk(req: Request): boolean {
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") && same(h.slice(7), need("INGEST_TOKEN"));
}

export const GAME = /^[a-z0-9][a-z0-9-]{0,62}$/;
export const FILE = /^[0-9a-f]{16}\.[a-z0-9]{1,5}$/;

/** A failed write, told to the kit (only a caller holding the token gets here), so the cause shows where `board.py push` runs. */
export function failed(err: unknown, store: string): Response {
  const why = err instanceof Error ? err.message : String(err);
  return new Response(`could not store in ${store}: ${why}`, { status: 500 });
}

/** A redirect by path alone. Behind a proxy (tailscale serve, an SSH forward) the request's own URL names this machine's address, not the one the browser used —
 *  an absolute Location would send the browser there. */
export function go(path: string): Response {
  return new Response(null, { status: 303, headers: { location: path } });
}
