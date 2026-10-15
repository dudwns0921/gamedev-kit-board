"use client";

import { useState } from "react";
import { ago, type Job } from "@/lib/board";
import type { Run } from "./not-needed";

// Claude run by this dashboard on the game, when answers were sent and no session of the game took them.
// The first time it is needed, the user is asked — once per game — and told what it may and may not do and what one run may cost at most.

const WORD = { running: "Claude is working on this game", done: "Last run finished", failed: "Last run stopped on an error", stopped: "Last run was stopped", ended: "Last run ended" };

export default function JobPanel({ job, untaken, run, look }: { job: Job | null; untaken: boolean; run: Run; look: () => void }) {
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState("");
  const [open, setOpen] = useState(false);
  if (!job || (!job.run && job.allowed === null && !untaken)) return null;

  async function go(a: Parameters<Run>[0]) {
    setBusy(true);
    const got = await run(a);
    setBusy(false);
    setSaid(got.said);
    look();
  }

  if (job.allowed === null && untaken) {
    return (
      <div className="card job ask">
        <span className="lab">No session took your answers</span>
        <h3>Let this dashboard run Claude for this game?</h3>
        <ul className="small">
          <li>When you send answers and no session of the game is open, it starts Claude Code in the game&apos;s folder. It reads your answers, works on,
            and stops at the next point where you have to answer or play — every question comes back here as a decision.</li>
          <li><b>It may</b> edit the game&apos;s files, run its builds and tests, and commit — and spend on what you approved here (an asset you approved).</li>
          <li><b>It may not</b> upload a build, push, open issues or send anything off this machine — those come back as decisions.</li>
          <li>One run at a time for this game; you can stop it here. Each run is a fresh session, and costs what it uses — at most the limit below.</li>
        </ul>
        <label className="small">Limit per run, in dollars <input className="num" inputMode="decimal" placeholder={String(job.budget)} value={budget}
          onChange={(e) => setBudget(e.target.value.replace(/[^\d.]/g, ""))} /></label>
        <div className="act">
          <button className="btn primary" disabled={busy} onClick={() => go({ action: "job-allow", on: true, budget: Number(budget) || job.budget })}>Allow and run</button>
          <button className="btn ghost" disabled={busy} onClick={() => go({ action: "job-allow", on: false })}>No — I will open a session</button>
        </div>
        {said ? <span className="small muted">{said}</span> : null}
      </div>
    );
  }

  const r = job.run;
  const cost = r?.cost !== undefined ? ` · $${r.cost.toFixed(2)}` : "";
  return (
    <div className={`card job${r?.status === "running" ? " on" : ""}`}>
      {r ? (
        <>
          <div className="row">
            <span className={`dot ${r.status}`} />
            <b>{WORD[r.status]}</b>
            <span className="small muted">{r.status === "running" ? `started ${ago(r.started)}` : `${ago(r.ended ?? r.started)}${r.turns ? ` · ${r.turns} turns` : ""}`}{cost}</span>
            <div className="act">
              {r.status === "running" ? <button className="btn ghost" disabled={busy} onClick={() => go({ action: "job-stop" })}>Stop</button>
                : job.allowed && untaken ? <button className="btn primary" disabled={busy} onClick={() => go({ action: "job-start" })}>Run again</button> : null}
              {job.lines.length ? <button className="link-btn" onClick={() => setOpen(!open)}>{open ? "Hide log" : "Log"}</button> : null}
            </div>
          </div>
          {r.status !== "running" && r.said ? <div className="small">{r.said}</div> : null}
          {open ? (
            <ol className="log">
              {job.lines.map((l, n) => <li key={n} className={l.kind}>{l.kind === "tool" ? <code>{l.text}</code> : l.text}</li>)}
            </ol>
          ) : null}
        </>
      ) : null}
      <div className="small muted">
        {job.allowed
          ? <>When no session takes your answers, this dashboard runs Claude for them (at most ${job.budget} a run). <button className="link-btn" disabled={busy} onClick={() => go({ action: "job-allow", on: false })}>Turn off</button></>
          : job.allowed === false
            ? <>{untaken ? "No session has taken your answers — open the game's session, or " : "This dashboard does not run Claude for this game. "}<button className="link-btn" disabled={busy} onClick={() => go({ action: "job-allow", on: true, budget: job.budget })}>let it run Claude here</button></>
            : "When no session takes your answers, you will be asked whether this dashboard may run Claude for them."}
      </div>
      {said ? <span className="small muted">{said}</span> : null}
    </div>
  );
}
