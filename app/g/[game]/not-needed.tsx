"use client";

import { useState } from "react";
import type { Act } from "@/lib/board";

// "Not needed" — withdraws a decision (or drops an asset attempt) in the game itself, on this machine. Two steps so a stray tap does nothing:
// the first opens a reason box and a confirm button; the confirm runs it.

export type Run = (a: Act) => Promise<{ ok: boolean; said: string }>;

export default function NotNeeded({ act, run, what }: { act: Act; run: Run | null; what: string }) {
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState("");
  if (!run) return null;
  if (!open) return <button className="link-btn" onClick={() => setOpen(true)}>Not needed</button>;
  return (
    <div className="nn">
      <span className="small">Withdraw {what}? It is marked not needed in the game and leaves this board.</span>
      {act.action === "drop-decision" ? (
        <input className="note" placeholder="Why (optional)" value={why} onChange={(e) => setWhy(e.target.value)} disabled={busy} />
      ) : null}
      <div className="row-btns">
        <button className="btn danger" disabled={busy} onClick={async () => {
          setBusy(true);
          const got = await run(act.action === "drop-decision" ? { ...act, why } : act);
          setBusy(false);
          setSaid(got.said);
          if (got.ok) setOpen(false);
        }}>{busy ? "Withdrawing…" : "Withdraw"}</button>
        <button className="btn ghost" disabled={busy} onClick={() => { setOpen(false); setSaid(""); }}>Cancel</button>
      </div>
      {said ? <span className="small muted">{said}</span> : null}
    </div>
  );
}
