import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// One person uses this: a password opens it, a signed cookie keeps it open, and the kit sends boards with a separate token.

export const COOKIE = "board_session";
const MAX_AGE = 60 * 60 * 24 * 30;

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

/** The cookie value: changes when the password or the secret changes, so either one logs every device out. */
function ticket(): string {
  return createHmac("sha256", need("SESSION_SECRET")).update("board:" + need("APP_PASSWORD")).digest("hex");
}

export function passwordOk(given: string): boolean {
  return same(given, need("APP_PASSWORD"));
}

/** Secure only when the page came over https — on this machine (http://localhost, an SSH forward) a secure cookie would not be kept by every browser. */
export async function startSession(req: Request): Promise<void> {
  const https = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  (await cookies()).set(COOKIE, ticket(), { httpOnly: true, secure: https, sameSite: "lax", path: "/", maxAge: MAX_AGE });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function signedIn(): Promise<boolean> {
  const got = (await cookies()).get(COOKIE)?.value;
  return Boolean(got) && same(got!, ticket());
}

/** Pages: go to the login when not signed in. */
export async function requireSession(): Promise<void> {
  if (!(await signedIn())) redirect("/login");
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
