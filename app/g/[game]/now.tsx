"use client";

import { useEffect, useState } from "react";
import { inHand, type Board, type Summary } from "@/lib/board";
import { Row, type OpenTask } from "./epics";

// What is in motion now: each cycle in hand — who is on it (a worker the CEO runs, or a window of the user's) and for how long,
// the tasks being built, what of it waits on the user — then whose build has the turn, and how the last workers ended. A cycle's head opens it in the Cycle tab.
// The page is told when a newer board arrives; only the "for how long" is counted here, on the minute.

const STOP: Record<string, [string, string]> = {
  decisions: ["you", "waits on your decisions"], turn: ["", "waits for the build turn"], play: ["acc", "yours to play"],
  blocked: ["bad", "blocked"], done: ["acc", "done"], "": ["bad", "ran out — see the CEO window"],
};

function since(at: string, now: number) {
  const t = Date.parse(at.replace(" ", "T"));
  if (Number.isNaN(t)) return "";
  const m = Math.max(0, Math.round((now - t) / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function Now({ s, b, open, review, cycle }: { s: Summary; b: Board; open: OpenTask; review: () => void; cycle: (num: string) => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  const work = s.work;
  const hand = inHand(s);
  const waiting = b.review.filter((i) => !i.later).length;
  if (!hand.length && !work?.workers.length) return <div className="empty">Nothing in motion — no cycle is open.</div>;
  return (
    <>
      <section className="card sec now-head">
        <div><span className="lab">Workers</span><b>{work ? work.workers.length : "—"}</b><small>{work ? "running now" : "the CEO is not used in this game"}</small></div>
        <div><span className="lab">Build turn</span><b>{work?.build ? `C${work.build.cycle ?? "?"}` : "free"}</b>
          <small>{work?.build ? `${work.build.what} · ${since(work.build.at, now)}` : "no build running"}</small></div>
        <button className="now-wait" onClick={review} disabled={!waiting}><span className="lab">Waiting on you</span><b>{waiting}</b><small>{waiting ? "Review →" : "nothing"}</small></button>
      </section>

      {hand.map((h) => {
        const n = Number(h.cycle);
        const c = b.cycles.find((x) => Number(x.num) === n);
        const w = work?.workers.find((x) => x.cycle === n);
        const who = work?.held.find((x) => Number(x.cycle) === n);
        const last = work?.ended.find((x) => x.cycle === n);
        const doing = (c?.list ?? []).filter((t) => t.mark === ">");
        const all = (c?.list ?? []).filter((t) => t.mark !== "-");
        const done = all.filter((t) => t.mark === "x").length;
        return (
          <section key={h.cycle} className="card sec now-cycle">
            <button className="now-open" onClick={() => cycle(c?.num ?? String(h.cycle))} aria-label={`Open cycle ${h.cycle}`}>
              <span className="lab">Cycle {h.cycle} — {h.name} · {h.stage}{work?.build && Number(work.build.cycle) === n ? " · building now" : ""}</span>
              <h2>{h.line || h.name}<span className="now-go" aria-hidden>→</span></h2>
            </button>
            <div className="now-who">
              {w ? <span className="chip acc"><i className="dot ep-doing" /> worker — {w.what} · {since(w.started, now)}</span>
                : who?.by === "window" ? <span className="chip">your window is on it</span>
                : <span className="chip">no one on it now</span>}
              {all.length ? <span className="chip">tasks {done}/{all.length}</span> : null}
              {h.review ? <button className="chip you" onClick={review}>{h.review} waiting on you →</button> : null}
            </div>
            {doing.length ? (
              <div className="now-tasks"><span className="lab">Being built</span>
                {doing.map((t) => <Row key={t.num} t={{ key: t.key ?? t.num, kind: "cycle", title: t.title, mark: t.mark }} open={open} epic={t.epic} />)}
              </div>
            ) : null}
            {last && !w ? (
              <div className="small muted">Last worker, {last.ended}: <span className={`chip ${STOP[last.stop]?.[0] ?? ""}`}>{STOP[last.stop]?.[1] ?? last.stop}</span> {last.said}</div>
            ) : null}
          </section>
        );
      })}

      {work?.ended.length ? (
        <section className="sec">
          <div className="sec-h"><h2>Workers lately</h2></div>
          <div className="card now-log">
            {work.ended.map((x, i) => (
              <div key={i} className="now-line">
                <code>C{String(x.cycle).padStart(2, "0")}</code>
                <span className="muted small">{x.kind} · {x.started.slice(11)} → {x.ended.slice(11)}</span>
                <span className={`chip ${STOP[x.stop]?.[0] ?? ""}`}>{STOP[x.stop]?.[1] ?? x.stop}</span>
                <span className="t">{x.said}</span>
                {typeof x.cost === "number" ? <span className="muted small">${x.cost.toFixed(2)}</span> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
