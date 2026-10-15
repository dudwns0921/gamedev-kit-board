import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { Answer, Summary } from "./board";

// The game's inbox: one file per batch the user sends, in <board>/inbox/. The kit's watcher renames a batch to .taken when it hands it to
// the session, and removes it once relayed. Written whole and renamed in, so a watcher never reads half a file.

const KEY = /^[\w.-]{1,120}$/;

function box(s: Summary): string | null {
  return s.local?.board ? path.join(s.local.board, "inbox") : null;
}

export async function send(s: Summary, rows: Answer[]): Promise<{ ok: boolean; said: string }> {
  const dir = box(s);
  if (!dir) return { ok: false, said: "This game's board did not come from this machine." };
  const clean = rows.filter((r) => KEY.test(r.key) && (r.pick || r.note))
    .map((r) => ({ key: r.key, pick: String(r.pick).slice(0, 40), note: String(r.note ?? "").replace(/\s+/g, " ").trim().slice(0, 1000) }));
  if (!clean.length) return { ok: false, said: "Pick an answer first." };
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  await fs.writeFile(path.join(dir, name + ".part"), JSON.stringify(clean));
  await fs.rename(path.join(dir, name + ".part"), path.join(dir, name + ".json"));
  return { ok: true, said: `Sent ${clean.length} to the session.` };
}

function alive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === "EPERM"; }
}

/** Where the game's session stands, as the kit wrote it in <board>/.session when it changed — shown as written, nothing judged here.
 *  The one fact checked: whether the process it names is still alive, since a process that is killed cannot write that it went. */
async function said(board: string): Promise<{ state: "on" | "work" | "off"; why: string; at: string } | null> {
  const got = JSON.parse(await fs.readFile(path.join(board, ".session"), "utf8").catch(() => "null")) as
    { state?: string; why?: string; at?: string; pid?: number | null } | null;
  if (!got || !["on", "work", "off"].includes(String(got.state))) return null;
  const state = got.state as "on" | "work" | "off";
  if (state !== "off" && Number.isInteger(got.pid) && !alive(got.pid as number))
    return { state: "off", why: state === "on" ? "its watcher stopped" : "the session stopped", at: got.at ?? "" };
  return { state, why: got.why ?? "", at: got.at ?? "" };
}

/** Which keys are waiting to be taken, taken by the session, or relayed to it and being worked on (until the board stops asking them).
 *  listening · working · ended: where the session stands, as the kit said it (null: a board from another machine, or a kit that does not say).
 *  untaken: answers are in the inbox and no session will take them until the user sends a message in one. */
export async function status(s: Summary): Promise<{ sent: string[]; taken: string[]; relayed: string[]; untaken: boolean; listening: boolean | null; working: boolean; ended: string; endedAt: string }> {
  const dir = box(s);
  const out = { sent: [] as string[], taken: [] as string[], relayed: [] as string[], untaken: false, listening: null as boolean | null, working: false, ended: "", endedAt: "" };
  if (!dir) return out;
  const names = await fs.readdir(dir).catch(() => [] as string[]);
  const st = await said(s.local!.board!);
  if (st) {
    out.listening = st.state === "on";
    out.working = st.state === "work";
    if (st.state === "off") ({ why: out.ended, at: out.endedAt } = st);
  }
  for (const n of names) {
    const where = n.endsWith(".json") ? out.sent : n.endsWith(".taken") ? out.taken : n.endsWith(".relayed") ? out.relayed : null;
    if (!where) continue;
    const rows = JSON.parse(await fs.readFile(path.join(dir, n), "utf8").catch(() => "[]")) as Answer[];
    where.push(...rows.map((r) => r.key));
  }
  out.untaken = st?.state === "off" && out.sent.length + out.taken.length > 0;
  return out;
}
