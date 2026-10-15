import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { Act, Summary } from "./board";
import { send, status } from "./inbox";
import { allow, start, stop } from "./jobs";

export type { Act };

// What the dashboard does to a game itself, on this machine: withdraw a decision, drop an asset attempt — then redraw and send the board.
// It runs the kit's own scripts (the same commands a session runs), with the paths the kit sent; nothing is passed through a shell.

const run = promisify(execFile);


const DOC = /^\d+-[A-Za-z0-9._-]+\.md$/;
const NUM = /^D\d+(,D\d+)*$/;
const NAME = /^[a-z0-9][a-z0-9_]*$/;

function command(a: Act, kit: string, root: string): string[] | string {
  if (a.action === "drop-decision") {
    if (!DOC.test(a.doc) || !NUM.test(a.num)) return "not a decision";
    const why = (a.why ?? "").replace(/\s+/g, " ").trim().slice(0, 300) || "not needed (from the dashboard)";
    return [path.join(kit, "skills/cycle/scripts/cycle.py"), "--root", root, "--doc", `docs/cycle/${a.doc}`, "drop", a.num, why];
  }
  if (a.action === "drop-asset") {
    if (!["asset", "sprite"].includes(a.tool) || !NAME.test(a.name)) return "not an asset";
    return [path.join(kit, `skills/asset/scripts/${a.tool}.py`), "--root", root, "drop", a.name];
  }
  return "unknown action";
}

export async function act(s: Summary, a: Act): Promise<{ ok: boolean; said: string }> {
  if (a.action === "send") return send(s, a.rows ?? []);
  if (a.action === "job-allow") {
    await allow(s.game, Boolean(a.on), Number(a.budget));
    if (!a.on) return { ok: true, said: "The dashboard will not run Claude for this game." };
    const { batches } = await status(s);
    return batches.length ? start(s, batches) : { ok: true, said: "Allowed — it runs when you send answers and no session takes them." };
  }
  if (a.action === "job-start") return start(s, (await status(s)).batches);
  if (a.action === "job-stop") return stop(s.game);
  const local = s.local;
  if (!local) return { ok: false, said: "This game's board did not come from this machine — act on it in the game's session." };
  const cmd = command(a, local.kit, local.root);
  if (typeof cmd === "string") return { ok: false, said: cmd };
  try {
    const done = await run(local.python, cmd, { cwd: local.root, timeout: 30_000 });
    // the board follows at once: redraw and send (the next turn's hook would do it too, later)
    // sent to this very dashboard, whatever the key file names
    const self = { GAMEDEV_BOARD_URL: `http://127.0.0.1:${process.env.PORT || 3000}`, GAMEDEV_BOARD_TOKEN: process.env.INGEST_TOKEN ?? "" };
    await run(local.python, [path.join(local.kit, "skills/board/scripts/board.py"), "--root", local.root, "push"],
      { cwd: local.root, timeout: 120_000, env: { ...process.env, ...self } })
      .catch(() => null);
    return { ok: true, said: done.stdout.trim().split("\n").pop() ?? "done" };
  } catch (err) {
    const e = err as { stderr?: string; message?: string };
    return { ok: false, said: (e.stderr || e.message || "failed").trim().split("\n").pop() ?? "failed" };
  }
}
