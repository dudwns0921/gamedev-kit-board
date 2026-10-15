import type { Act, Summary } from "./board";
import { send } from "./inbox";

export type { Act };

// The dashboard only signals: answers — an option, approve, OK, "not needed" — go to the game's inbox, and the game's Claude session does the work.
// Nothing is run here; the board the session redraws is how this page learns what happened.

export async function act(s: Summary, a: Act): Promise<{ ok: boolean; said: string }> {
  if (a.action === "send") return send(s, a.rows ?? []);
  return { ok: false, said: "unknown action" };
}
