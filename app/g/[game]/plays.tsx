"use client";

import { Fragment, useEffect, useState } from "react";
import type { Board, PlayRun } from "@/lib/board";
import type { Zoom } from "./review";

// The game's screens, build by build — every run of the play route (the kit's `board.py play`, shot at the end of each build).
// One run is its stops in play order, grouped by stage; "Beside the run before" pairs each stop with the run before it;
// a stop opens across every run, newest first. This is the one place pictures of the game are seen.

export type PlayAt = { run: string | null; stage: string | null };

export function Plays({ b, file, zoom, at, pick }: { b: Board; file: (p: string) => string; zoom: Zoom; at: PlayAt; pick: (a: PlayAt) => void }) {
  const runs = b.plays ?? [];
  const [pair, setPair] = useState(false);
  const [stop, setStop] = useState<string | null>(null);  // one stop across every run
  const i = Math.max(0, runs.findIndex((r) => r.id === at.run));
  const run = runs[i];
  const before = runs[i + 1];

  useEffect(() => {  // a task's link opens its build's run at its stage
    if (at.stage) document.getElementById(`pl-${at.stage}`)?.scrollIntoView({ block: "start" });
  }, [at.stage, at.run]);

  if (!runs.length) {
    return (
      <div className="empty">
        {b.route?.length
          ? <>The play route is set ({b.route.length} stops) — its first run is shot at the end of the next build.</>
          : <>No play route yet. The kit makes one as a Foundation task in the next cycle: one to three stops per stage of play, shot at the end of every build.</>}
      </div>
    );
  }

  if (stop) {
    const one = runs.flatMap((r) => r.stops.filter((s) => s.id === stop && s.img).map((s) => ({ r, s })));
    const name = one[0]?.s;
    return (
      <>
        <button className="btn ghost" onClick={() => setStop(null)}>← All stops</button>
        <section className="card sec">
          <span className="lab">{name?.stage ?? ""} · over time</span>
          <h1>{name?.what || stop}</h1>
          <div className="small muted">{one.length} run{one.length === 1 ? "" : "s"}, newest first</div>
        </section>
        <div className="pl-grid">
          {one.map(({ r, s }) => <Shot key={r.id} src={file(s.img)} label={`${r.what} · ${r.at}`} zoom={zoom} />)}
        </div>
      </>
    );
  }

  const stages = [...new Set(run.stops.map((s) => s.stage))];
  const shot = run.stops.filter((s) => s.img).length;
  return (
    <>
      <div className="ep-cycles" role="group" aria-label="Runs">
        {runs.map((r) => (
          <button key={r.id} className={r === run ? "on" : ""} aria-pressed={r === run} onClick={() => pick({ run: r.id, stage: null })}>
            <b>{r.what}</b><small>{r.at} · {r.stops.filter((s) => s.img).length}/{r.stops.length}</small>
          </button>
        ))}
      </div>
      <section className="card sec">
        <span className="lab">Play route · {run.at}{run.commit ? ` · ${run.commit}` : ""}</span>
        <h1>{run.what}</h1>
        <div className="small muted">{shot} of {run.stops.length} stops shot{shot < run.stops.length ? " — the rest the harness did not save" : ""}</div>
        {before ? (
          <button className={`btn${pair ? " primary" : ""}`} style={{ marginTop: 10, whiteSpace: "normal", textAlign: "left", height: "auto" }} aria-pressed={pair} onClick={() => setPair(!pair)}>
            Beside the run before ({before.what} · {before.at})
          </button>
        ) : null}
      </section>
      {stages.map((stage) => (
        <Fragment key={stage}>
          <div className="sec-h" id={`pl-${stage}`}><h2>{stage || "—"}</h2></div>
          <div className={pair ? "pl-pairs" : "pl-grid"}>
            {run.stops.filter((s) => s.stage === stage).map((s) => {
              const was = before?.stops.find((x) => x.id === s.id && x.img);
              return (
                <div key={s.id} className="pl-stop">
                  <div className={pair ? "pl-two" : "pl-one"}>
                    {pair ? (was ? <Shot src={file(was.img)} label={`before · ${before!.at}`} zoom={zoom} /> : <Missing word="not in the run before" />) : null}
                    {s.img ? <Shot src={file(s.img)} label={pair ? `now · ${run.at}` : ""} zoom={zoom} /> : <Missing word="not shot in this run" />}
                  </div>
                  <button className="pl-what" onClick={() => setStop(s.id)} title="This stop across every run">
                    <span>{s.what || s.id}</span><small>over time →</small>
                  </button>
                </div>
              );
            })}
          </div>
        </Fragment>
      ))}
    </>
  );
}

function Shot({ src, label, zoom }: { src: string; label: string; zoom: Zoom }) {
  return (
    <button className="pl-shot" onClick={() => zoom(src, label)} aria-label={label || "screen"}>
      <img src={src} alt="" loading="lazy" />
      {label ? <small>{label}</small> : null}
    </button>
  );
}

function Missing({ word }: { word: string }) {
  return <div className="pl-none"><span>{word}</span></div>;
}

/** The newest run of the build a task was done in — a cycle's build, or a playtest round. */
export function runOf(b: Board, kind: string, cycle: string, doc: string): PlayRun | undefined {
  return (b.plays ?? []).find((r) => (kind === "playtest" ? r.playtest === doc : r.cycle !== "" && Number(r.cycle) === Number(cycle)));
}
