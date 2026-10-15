"use client";

import { useState } from "react";
import type { Act } from "@/lib/board";

// "Not needed" — sent to the game's session like any answer; it withdraws the decision (or drops the asset attempt) there, and the card leaves
// once the board no longer asks it. Two steps so a stray tap does nothing: the first opens a reason box and a confirm button.

export type Run = (a: Act) => Promise<{ ok: boolean; said: string }>;

export default function NotNeeded({ item, run, what }: { item: string; run: Run | null; what: string }) {
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState("");
  if (!run) return null;
  if (!open) return <button className="link-btn" onClick={() => setOpen(true)}>Not needed</button>;
  return (
    <div className="nn">
      <span className="small">Send “not needed” for {what}? The game&apos;s session withdraws it, and it leaves this board.</span>
      <input className="note" placeholder="Why (optional)" value={why} onChange={(e) => setWhy(e.target.value)} disabled={busy} />
      <div className="row-btns">
        <button className="btn danger" disabled={busy} onClick={async () => {
          setBusy(true);
          const got = await run({ action: "send", rows: [{ key: item, pick: "drop", note: why }] });
          setBusy(false);
          setSaid(got.said);
          if (got.ok) setOpen(false);
        }}>{busy ? "Sending…" : "Send"}</button>
        <button className="btn ghost" disabled={busy} onClick={() => { setOpen(false); setSaid(""); }}>Cancel</button>
      </div>
      {said ? <span className="small muted">{said}</span> : null}
    </div>
  );
}
