"use client";

import type { Board, Item, St } from "@/lib/board";

// Every thing the board counts, in one list — so whatever is a problem, not made or a placeholder can be seen without opening each stage.
// Nothing here acts: each row says where its state was read from and what closes it, and the work is done in the game's Claude session.

export const WORD: Record<St, string> = { done: "Done", temp: "Placeholder", none: "Not made", bad: "Problem" };
const ORDER: St[] = ["bad", "none", "temp", "done"];

// Where an item's state is read from (the kit's `src`), and what moves it on — per state.
const FROM: Record<string, { name: string; closes: Partial<Record<St, string>> }> = {
  gdd: { name: "GDD table", closes: {
    bad: "The GDD and the code disagree — sync them (gdd-sync); which side is right is yours to say.",
    none: "In the GDD, not in the code yet — built in a cycle; if it is already in the code, gdd-sync marks it.",
  } },
  slot: { name: "Asset slot", closes: {
    none: "No file yet — made in a cycle, kept on its placeholder (have … \"placeholder\"), or dropped (have … \"dropped — why\").",
    temp: "Runs on a placeholder — replaced when the real file is made.",
  } },
  file: { name: "Asset file", closes: {} },
  cycle: { name: "Cycle", closes: {
    temp: "Waiting to be played — answer its checks on the Review tab.",
    none: "The cycle has not reached Play yet.",
  } },
  playtest: { name: "Playtest task", closes: {
    bad: "Still open — fixed (done) or closed with its reason (dropped), by the playtest skill.",
  } },
  note: { name: "Your note", closes: {
    bad: "A line you wrote in docs/board-notes.md — edit or remove it there.",
    none: "A line you wrote in docs/board-notes.md — edit or remove it there.",
    temp: "A line you wrote in docs/board-notes.md — edit or remove it there.",
  } },
};

type Row = { i: Item; stage: string; lane: string };

export function rowsOf(b: Board): Row[] {
  const lane = Object.fromEntries(b.lanes.map((l) => [l.key, l.label]));
  return b.stages.flatMap((s) => Object.entries(s.lanes).flatMap(([k, items]) => items.map((i) => ({ i, stage: s.name, lane: lane[k] ?? k }))));
}

export function Criteria() {
  return (
    <details className="card criteria" open>
      <summary><b>How each state is counted</b> <span className="small muted">— read from the game&apos;s documents, never judged</span></summary>
      <table>
        <thead><tr><th>Lane</th><th>Done</th><th>Placeholder</th><th>Not made</th><th>Problem</th></tr></thead>
        <tbody>
          <tr><th>Function</th><td>a GDD table row matches the code</td><td>—</td><td>in the GDD, not in the code</td><td>the GDD and the code disagree</td></tr>
          <tr><th>Art · Sound</th><td>the file is in the game, or the slot names its path</td><td>the slot says placeholder</td><td>the slot says none</td><td>—</td></tr>
          <tr><th>Verified</th><td>a cycle played and closed · a playtest task fixed</td><td>a cycle waiting to be played · closed with checks never answered</td><td>a cycle before Play</td><td>a playtest task still open or blocked</td></tr>
        </tbody>
      </table>
      <ul className="small muted">
        <li>Your notes in <code>docs/board-notes.md</code> count as you wrote them.</li>
        <li>Not counted: a playtest task dropped with its reason, an asset slot marked dropped.</li>
        <li>Decisions, GDD questions and to-dos are not here — they wait on the Review tab.</li>
        <li>A stage&apos;s % counts Done as 1, Placeholder as ½, Not made and Problem as 0.</li>
      </ul>
    </details>
  );
}

export default function Items({ b, show, pick }: { b: Board; show: St | "all"; pick: (s: St | "all") => void }) {
  const rows = rowsOf(b);
  const count = (s: St) => rows.filter((r) => r.i.st === s).length;
  const shown = rows.filter((r) => show === "all" || r.i.st === show).sort((x, y) => ORDER.indexOf(x.i.st) - ORDER.indexOf(y.i.st));
  const stages = [...new Set(shown.map((r) => r.stage))];
  return (
    <>
      <Criteria />
      <div className="chips filter">
        {ORDER.map((s) => (
          <button key={s} className={`chip${show === s ? " on" : ""}${s === "bad" && count(s) ? " bad" : ""}`} onClick={() => pick(show === s ? "all" : s)}>
            <i className={`dot st-${s}`} />{WORD[s]} {count(s)}
          </button>
        ))}
        <button className={`chip${show === "all" ? " on" : ""}`} onClick={() => pick("all")}>All {rows.length}</button>
      </div>
      {!shown.length ? <div className="empty">Nothing {show === "all" ? "counted yet" : `is ${WORD[show as St].toLowerCase()}`}.</div> : null}
      {stages.map((st) => (
        <section key={st} className="sec">
          <div className="sec-h"><h2>{st}</h2><span className="lab">{shown.filter((r) => r.stage === st).length}</span></div>
          <ul className="list card">
            {shown.filter((r) => r.stage === st).map((r, n) => {
              const from = FROM[r.i.src ?? ""];
              const closes = from?.closes[r.i.st];
              return (
                <li key={n}>
                  <i className={`dot st-${r.i.st}`} title={WORD[r.i.st]} />
                  <div className="t">
                    <span>{r.i.code ? <code>{r.i.code}</code> : null}<b>{r.i.title}</b></span>
                    <small>{[r.lane, from?.name, r.i.sub, r.i.note].filter(Boolean).join(" · ")}</small>
                    {closes ? <small className="closes">{closes}</small> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
