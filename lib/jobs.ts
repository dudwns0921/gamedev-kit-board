import { spawn } from "node:child_process";
import { promises as fs, openSync, closeSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { Job, JobLine, Summary } from "./board";

// A job: Claude Code run here, in the game's folder, when the user sent answers and no session of the game took them.
// It reads the answers, works on, and stops at the next point where the user has to answer or play — so every run is a short session of its own.
// One per game at a time. It runs only once the user has allowed it for that game (the consent card), with outward actions closed off twice:
// by tool rules here, and by the kit's own scripts, which refuse to upload, push or post while GAMEDEV_KIT_JOB is set.
// State and logs live in .data/jobs/ beside the app.

const DIR = path.join(process.cwd(), ".data", "jobs");
const BUDGET = 5; // dollars per run unless the user set another on the consent card
const KEEP = 20; // logs kept per game

type Consent = { on: boolean; at: string; budget: number };
type State = { id: string; pid: number; started: string; batches?: string[]; ended?: string; status: NonNullable<Job["run"]>["status"]; cost?: number; turns?: number; said?: string };

const file = (game: string, what: string) => path.join(DIR, `${game}.${what}`);

async function load<T>(p: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(p, "utf8")) as T;
  } catch {
    return null;
  }
}

async function save(p: string, v: unknown): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(p + ".part", JSON.stringify(v));
  await fs.rename(p + ".part", p);
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

export async function consent(game: string): Promise<Consent | null> {
  return load<Consent>(file(game, "consent.json"));
}

export async function allow(game: string, on: boolean, budget?: number): Promise<void> {
  const b = Number.isFinite(budget) && budget! > 0 && budget! <= 100 ? Number(budget) : BUDGET;
  await save(file(game, "consent.json"), { on, at: new Date().toISOString(), budget: b });
}

async function state(game: string): Promise<State | null> {
  const s = await load<State>(file(game, "job.json"));
  if (s && s.status === "running" && !alive(s.pid)) { // the app restarted while it ran, or it was killed from outside
    s.status = "ended";
    s.ended = s.ended ?? new Date().toISOString();
    await save(file(game, "job.json"), s);
  }
  return s;
}

export async function running(game: string): Promise<boolean> {
  return (await state(game))?.status === "running";
}

/** Whether to start a run by itself for these untaken batches: allowed, nothing running, and at least one batch no run was started for —
 *  a run that ended without taking its batch (Claude not logged in, an error) is not started again on its own; the user presses Run again. */
export async function due(game: string, batches: string[]): Promise<boolean> {
  if (!batches.length || !(await consent(game))?.on) return false;
  const st = await state(game);
  if (st?.status === "running") return false;
  const tried = new Set(st?.batches ?? []);
  return batches.some((b) => !tried.has(b));
}

const PROMPT = (kit: string) =>
  [
    "You were started by the gamedev-kit dashboard: the user sent answers from it, and no session of this game was open to take them.",
    `First run: python3 "${kit}/skills/board/scripts/board.py" answers --inbox — and act on each line as it says, through the kit's skills, exactly as with answers given in the chat.`,
    "Then carry on with the newest cycle (the cycle skill's `next`) and stop at the next point where the user has to answer or play.",
    "Nobody reads this conversation. Every question for the user is a decision written with the cycle skill's `ask` (with --image for what they should look at) — never a question in text.",
    "Do not deploy, push, post or send anything off this machine; if the work needs it, ask it as a decision and stop.",
    "End with one short line saying what was done and what now waits on the user.",
  ].join("\n");

/** Start a run for this game, unless one is running or the user has not allowed it. */
export async function start(s: Summary, batches: string[] = []): Promise<{ ok: boolean; said: string }> {
  const local = s.local;
  if (!local) return { ok: false, said: "This game's board did not come from this machine." };
  const c = await consent(s.game);
  if (!c?.on) return { ok: false, said: "Allow the dashboard to run Claude for this game first." };
  if (await running(s.game)) return { ok: false, said: "Claude is already working on this game." };
  await fs.mkdir(DIR, { recursive: true });
  const id = `${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}-${randomBytes(2).toString("hex")}`;
  const log = file(s.game, `${id}.log`);
  const out = openSync(log, "a");
  const args = ["-p", PROMPT(local.kit), "--output-format", "stream-json", "--verbose",
    "--permission-mode", "acceptEdits",
    "--allowedTools", "Bash", "Read", "Edit", "Write", "Glob", "Grep", "Task", "Agent", "Skill", "TodoWrite",
    "--disallowedTools", "Bash(git push:*)", "Bash(gh:*)", "Bash(curl:*)", "WebFetch",
    "--max-budget-usd", String(c.budget)];
  const child = spawn(process.env.CLAUDE_BIN || "claude", args, {
    cwd: local.root, detached: true, stdio: ["ignore", out, out],
    env: { ...process.env, GAMEDEV_KIT_JOB: id },
  });
  closeSync(out);
  if (!child.pid) return { ok: false, said: "Claude Code could not be started — is `claude` installed on this machine?" };
  const st: State = { id, pid: child.pid, started: new Date().toISOString(), status: "running", batches };
  await save(file(s.game, "job.json"), st);
  child.on("exit", async (code, signal) => {
    const lines = await read(log);
    const end = [...lines].reverse().find((l) => l.kind === "result");
    const now = (await load<State>(file(s.game, "job.json"))) ?? st;
    if (now.id !== id) return;
    await save(file(s.game, "job.json"), {
      ...now, ended: new Date().toISOString(),
      status: now.status === "stopped" ? "stopped" : code === 0 && !end?.error ? "done" : "failed",
      cost: end?.cost, turns: end?.turns,
      said: now.status === "stopped" ? "Stopped from the dashboard." : end?.text || (signal ? `It was ended (${signal}).` : `Claude Code exited with ${code} — see the log.`),
    });
    await prune(s.game);
  });
  child.unref();
  return { ok: true, said: "Claude started on this game — it reads your answers and works until it needs you again." };
}

export async function stop(game: string): Promise<{ ok: boolean; said: string }> {
  const st = await state(game);
  if (!st || st.status !== "running") return { ok: false, said: "Nothing is running." };
  await save(file(game, "job.json"), { ...st, status: "stopped" });
  try {
    process.kill(-st.pid, "SIGTERM"); // the whole group — Claude and what it started
  } catch {
    try { process.kill(st.pid, "SIGTERM"); } catch { /* gone already */ }
  }
  return { ok: true, said: "Stopped." };
}

async function prune(game: string): Promise<void> {
  const logs = (await fs.readdir(DIR).catch(() => [] as string[])).filter((n) => n.startsWith(game + ".") && n.endsWith(".log")).sort();
  for (const n of logs.slice(0, Math.max(0, logs.length - KEEP))) await fs.rm(path.join(DIR, n), { force: true });
}

/** The stream-json log, as short lines a person can follow: what Claude said, which tool it used, how it ended. */
async function read(log: string): Promise<JobLine[]> {
  const text = await fs.readFile(log, "utf8").catch(() => "");
  const out: JobLine[] = [];
  for (const raw of text.split("\n")) {
    if (!raw.startsWith("{")) continue;
    let e: Record<string, unknown>;
    try { e = JSON.parse(raw); } catch { continue; }
    if (e.type === "assistant") {
      const content = ((e.message as { content?: unknown[] })?.content ?? []) as Record<string, unknown>[];
      for (const c of content) {
        if (c.type === "text" && String(c.text).trim()) out.push({ kind: "say", text: String(c.text).trim().slice(0, 600) });
        if (c.type === "tool_use") out.push({ kind: "tool", text: `${c.name} ${brief(c.input)}`.slice(0, 200) });
      }
    } else if (e.type === "result") {
      out.push({ kind: "result", text: String(e.result ?? "").trim().slice(0, 600), error: Boolean(e.is_error),
        cost: typeof e.total_cost_usd === "number" ? e.total_cost_usd : undefined, turns: typeof e.num_turns === "number" ? e.num_turns : undefined });
    }
  }
  return out;
}

function brief(input: unknown): string {
  const i = (input ?? {}) as Record<string, unknown>;
  const v = i.command ?? i.file_path ?? i.pattern ?? i.description ?? i.skill ?? i.prompt ?? "";
  return String(v).replace(/\s+/g, " ").slice(0, 160);
}

/** What the page shows: the allowance, the current or last run and the end of its log. */
export async function view(game: string): Promise<Job> {
  const c = await consent(game);
  const st = await state(game);
  const lines = st ? await read(file(game, `${st.id}.log`)) : [];
  return {
    allowed: c ? c.on : null, budget: c?.budget ?? BUDGET,
    run: st ? { id: st.id, status: st.status, started: st.started, ended: st.ended, cost: st.cost ?? lines.findLast((l) => l.kind === "result")?.cost,
      turns: st.turns, said: st.said } : null,
    lines: lines.slice(-40),
  };
}
