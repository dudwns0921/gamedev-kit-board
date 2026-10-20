"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import type { Active, BacklogItem, Board, EpicTask, Stage, TaskDetail } from "@/lib/board";
import { runOf } from "./plays";

// The game laid out as epics: each stage of play is one (and Foundation, for what no stage owns), holding the tasks of every cycle and playtest that name it.
// The epic cards stay on top, words only; the chosen one opens under all of them — its cycles, in one row, and what is picked below it.
// Screens of the game are in the Play tab only (the play route's runs).
// A task opens in a panel from the right, with the lines written under it; which of those the panel shows is the viewer's choice, kept in this browser.

export type OpenTask = (key: string) => void;

const MARK: Record<string, [string, string]> = { x: ["done", "Done"], ">": ["doing", "In hand"], " ": ["open", "To do"], "!": ["blocked", "Blocked"], "-": ["dropped", "Dropped"] };

function counts(ts: { mark: string }[]) {
  return { done: ts.filter((t) => t.mark === "x").length, doing: ts.filter((t) => t.mark === ">").length,
    open: ts.filter((t) => t.mark === " ").length, blocked: ts.filter((t) => t.mark === "!").length };
}

function Bar({ c }: { c: ReturnType<typeof counts> }) {
  const n = c.done + c.doing + c.open + c.blocked;
  return (
    <div className="meter" title={`done ${c.done} · in hand ${c.doing} · to do ${c.open} · blocked ${c.blocked}`}>
      {n ? (["done", "doing", "blocked", "open"] as const).map((k) => (c[k] ? <i key={k} className={`ep-${k}`} style={{ flex: c[k] }} /> : null)) : null}
    </div>
  );
}

function Counts({ c }: { c: ReturnType<typeof counts> }) {
  return (
    <div className="legend">
      <span><i className="dot ep-done" />{c.done} done</span>
      {c.doing ? <span><i className="dot ep-doing" />{c.doing} in hand</span> : null}
      <span><i className="dot ep-open" />{c.open} to do</span>
      {c.blocked ? <span><i className="dot ep-blocked" />{c.blocked} blocked</span> : null}
    </div>
  );
}

/** The documents' inline marks — `code`, **bold** — and their bullet lines, drawn as such. */
function Md({ text }: { text: string }) {
  const inline = (s: string) => s.split(/(`[^`]+`|\*\*[^*]+\*\*)/).map((p, i) =>
    p.startsWith("`") && p.endsWith("`") && p.length > 1 ? <code key={i}>{p.slice(1, -1)}</code>
      : p.startsWith("**") && p.endsWith("**") && p.length > 3 ? <b key={i}>{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>);
  const out: ReactNode[] = [];
  let list: ReactNode[] = [];
  const flush = () => { if (list.length) { out.push(<ul key={`u${out.length}`}>{list}</ul>); list = []; } };
  text.split("\n").forEach((line, i) => {
    const m = line.match(/^[-*] (.*)/);
    if (m) list.push(<li key={i}>{inline(m[1])}</li>);
    else { flush(); if (line.trim()) out.push(<div key={i}>{inline(line)}</div>); }
  });
  flush();
  return <>{out}</>;
}

function Row({ t, open, epic }: { t: EpicTask | { key: string; kind: string; title: string; mark: string }; open: OpenTask; epic?: string }) {
  const [cls, word] = MARK[t.mark] ?? MARK[" "];
  return (
    <button className="ep-row" onClick={() => open(t.key)}>
      <i className={`dot ep-${cls}`} title={word} />
      <span className="t">
        <b className={t.mark === "-" ? "struck" : ""}>{t.title}</b>
        <span className="meta"><code>{t.key}</code>{t.kind === "playtest" ? <span className="chip bad">playtest</span> : null}{epic ? <span className="chip">{epic}</span> : null}</span>
      </span>
    </button>
  );
}

const waiting = (b: Board, st: Stage) => (b.backlog ?? []).filter((x) => x.mark === " " && x.stage === st.i);

export function Epics({ b, file, open, sel, pick: choose, zoom }: {
  b: Board; file: (p: string) => string; open: OpenTask; sel: number | null; pick: (i: number | null) => void; zoom: (src: string, label: string) => void;
}) {
  const [group, setGroup] = useState<string | null>(null);
  const setSel = (i: number | null) => { choose(i); if (i !== null) requestAnimationFrame(() => document.getElementById("epic-detail")?.scrollIntoView({ block: "nearest" })); };
  const epics = b.stages.filter((st) => st.epic && (!st.common || st.epic.tasks.length));
  if (!epics.length) return <div className="empty">This board came from a kit without epics — update the plugin in the game and let it redraw.</div>;
  const st = epics.find((x) => x.i === sel);
  const live = (ts: EpicTask[]) => ts.filter((t) => t.mark !== "-");
  let groups: { id: string; label: string; sub: string; tasks?: EpicTask[]; backlog?: BacklogItem[] }[] = [];
  if (st?.epic) {
    const ts = live(st.epic.tasks);
    for (const c of [...b.cycles].reverse()) {
      const here = ts.filter((t) => t.kind === "cycle" && t.cycle === c.num);
      if (here.length) groups.push({ id: `c${c.num}`, label: `Cycle ${c.num}`, sub: c.name, tasks: here });
    }
    const bugs = ts.filter((t) => t.kind === "playtest");
    if (bugs.length) groups.push({ id: "pt", label: "Playtests", sub: `${bugs.length} problems`, tasks: bugs });
    const bl = waiting(b, st);
    if (bl.length) groups.push({ id: "bl", label: "Backlog", sub: `${bl.length} waiting`, backlog: bl });
  } else groups = [];
  const pick = groups.find((g) => g.id === group) ?? groups[0];
  return (
    <>
      <div className="flow">
        {epics.map((x) => {
          const c = counts(live(x.epic!.tasks));
          const queued = waiting(b, x).length;
          return (
            <button key={x.i} className={`card link stage ep-card${x.i === sel ? " sel" : ""}`} aria-expanded={x.i === sel}
              onClick={() => { setSel(x.i === sel ? null : x.i); setGroup(null); }}>
              <span className="lab">{x.foundation ? "Foundation" : x.common ? "To sort" : "Epic"}{x.loop ? " · loop" : ""}</span>
              <h2>{x.name}</h2>
              {x.about ? <span className="small muted">{x.about}</span> : null}
              <Bar c={c} />
              <Counts c={c} />
              {x.halves && (x.halves.function !== null || x.halves.assets !== null) ? (
                <span className="small muted">Function <b className="mono">{x.halves.function ?? "—"}%</b> · Assets <b className="mono">{x.halves.assets ?? "—"}%</b></span>
              ) : null}
              {queued || x.open.length ? (
                <div className="chips">{queued ? <span className="chip warn">backlog {queued}</span> : null}{x.open.length ? <span className="chip bad">{x.open.length} undecided</span> : null}</div>
              ) : null}
            </button>
          );
        })}
      </div>
      {st ? (
        <section className="card sec" id="epic-detail">
          <div className="sec-h"><span className="lab">Epic</span><h2>{st.name}</h2><Counts c={counts(live(st.epic!.tasks))} /></div>
          {groups.length ? (
            <div className="ep-cycles" role="group" aria-label="Cycles">
              {groups.map((g) => {
                const c = g.tasks ? counts(g.tasks) : null;
                return (
                  <button key={g.id} className={g === pick ? "on" : ""} aria-pressed={g === pick} onClick={() => setGroup(g.id)}>
                    <b>{g.label}</b><small>{c && g.tasks ? `${c.done}/${g.tasks.length} done` : g.sub}</small>
                  </button>
                );
              })}
            </div>
          ) : <div className="small muted">No tasks name this epic yet.</div>}
          {pick ? (
            <div className="ep-list">
              <span className="lab">{pick.label} — {pick.sub}</span>
              {pick.backlog ? pick.backlog.map((x) => <div key={x.num} className="ep-bl"><code>{x.num}</code><span>{x.text}</span></div>)
                : pick.tasks!.map((t) => <Row key={t.key} t={t} open={open} />)}
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

const STEPS = ["Goal", "Spec", "Design", "Plan", "Build", "Play"];
const COLUMNS: [string, string][] = [["To do", " "], ["In hand", ">"], ["Blocked", "!"], ["Done", "x"]];

/** One cycle as a board: its goal and where it stands on top, its tasks in four columns. Any cycle can be picked from the row above it. */
export function Sprint({ b, sel, pick, open, waiting, review, hand = [] }: {
  b: Board; sel: string; pick: (c: string) => void; open: OpenTask; waiting: number; review: () => void; hand?: Active[];
}) {
  const c = b.cycles.find((x) => x.num === sel) ?? b.cycles[b.cycles.length - 1];
  if (!c) return <div className="empty">No cycle yet — <code>/gamedev-kit:cycle</code> starts one.</div>;
  const steps = b.steps ?? STEPS;
  const at = steps.indexOf(c.stage);
  const list = (c.list ?? []).filter((t) => t.mark !== "-");
  const name = (t: { epic?: string; stages?: number[] }) => t.epic || "";
  const newest = c === b.cycles[b.cycles.length - 1];
  const several = hand.length > 1;  // several sessions at once, each on its own cycle — each in hand is marked, and says what of it waits
  const mine = hand.find((h) => h.cycle === c.num);
  const wait = several ? mine?.review ?? 0 : newest ? waiting : 0;
  return (
    <>
      <div className="ep-cycles" role="group" aria-label="Cycles">
        {[...b.cycles].reverse().map((x) => (
          <button key={x.num} className={x.num === c.num ? "on" : ""} aria-pressed={x.num === c.num} onClick={() => pick(x.num)}>
            <b>Cycle {x.num}</b><small>{x.stage} · {x.tasks.done}/{x.tasks.done + x.tasks.open + x.tasks.blocked + (x.tasks.doing ?? 0)}</small>
            {several && hand.some((h) => h.cycle === x.num)
              ? <small>{hand.find((h) => h.cycle === x.num)?.building ? "in hand · building" : "in hand"}</small> : null}
          </button>
        ))}
      </div>
      <section className="card sec">
        <span className="lab">Cycle {c.num} — {c.name}{c.start ? ` · started ${c.start}` : ""}
          {several && mine ? ` · ${mine.building ? "building now" : mine.session ? "a session is on it" : "in hand"}` : ""}</span>
        <div className="steps">
          {steps.map((k, i) => (
            <span key={k} className={`step${k === c.stage ? " on" : c.skipped?.includes(k) ? " skip" : c.stage === "Closed" || (at >= 0 && i < at) ? " past" : ""}`}>{k}</span>
          ))}
        </div>
        <h1>{c.line || c.name}</h1>
        {c.goal && c.line ? <div className="small muted clamp">{c.goal}</div> : null}
        <Counts c={counts(list)} />
        {wait ? <button className="btn primary ep-wait" onClick={review}>{wait} waiting on you — Review →</button> : null}
      </section>
      <div className="ep-board">
        {COLUMNS.map(([label, m]) => {
          const here = list.filter((t) => t.mark === m);
          return (
            <section key={label} className="card ep-col">
              <h3><span>{label}</span><span className="muted">{here.length}</span></h3>
              {here.length ? here.map((t) => <Row key={t.num} t={{ key: t.key ?? t.num, kind: "cycle", title: t.title, mark: t.mark }} open={open} epic={name(t)} />)
                : <span className="small muted">None</span>}
            </section>
          );
        })}
      </div>
    </>
  );
}

export function Backlog({ b }: { b: Board }) {
  const all = b.backlog ?? [];
  const open = all.filter((x) => x.mark === " ");
  const gone = all.length - open.length;
  const by = new Map<number | null, BacklogItem[]>();
  for (const x of open) by.set(x.stage, [...(by.get(x.stage) ?? []), x]);
  const order = [...b.stages.filter((st) => by.has(st.i)).map((st) => st.i as number | null), ...(by.has(null) ? [null] : [])];
  return (
    <>
      <div className="legend"><span><i className="dot st-temp" />{open.length} waiting</span>{gone ? <span><i className="dot st-none" />{gone} taken or dropped</span> : null}</div>
      {open.length ? order.map((i) => (
        <section key={String(i)} className="card sec">
          <div className="sec-h"><h3>{i === null ? "No epic yet" : b.stages.find((st) => st.i === i)?.name}</h3><span className="lab">{by.get(i)!.length}</span></div>
          <div className="ep-list">
            {by.get(i)!.map((x) => (
              <div key={x.num} className="ep-bl"><code>{x.num}</code>
                <span>{x.text}<small className="lab">from cycle {x.from}{x.key ? " · answered on the dashboard" : ""}</small></span>
              </div>
            ))}
          </div>
        </section>
      )) : <div className="empty">Nothing waits in the backlog. What the user puts off goes here (<code>cycle.py later</code>) until a cycle takes it.</div>}
    </>
  );
}

// A task, for the user: what it is, how the game will change, what changed (or why it is stuck), and the GDD ids it touches — nothing written for the implementer.
export function TaskPanel({ b, k, close, show }: { b: Board; k: string; close: () => void; show?: (run: string, stage: string | null) => void }) {
  useEffect(() => {
    const off = (ev: KeyboardEvent) => ev.key === "Escape" && close();
    addEventListener("keydown", off);
    return () => removeEventListener("keydown", off);
  }, [close]);
  const t: TaskDetail | undefined = b.tasks?.[k];
  if (!t) return null;
  const st = t.epic !== null ? b.stages.find((x) => x.i === t.epic) : undefined;
  const cyc = b.cycles.find((c) => c.num === t.cycle);
  const field = (name: string) => t.fields.find((f) => f.k === name)?.v ?? "";
  const [cls, word] = MARK[t.mark] ?? MARK[" "];
  const what = field("What"), change = field("Change"), done = field("Done"), stuck = field("Blocked") || field("Dropped");
  const ids = [...new Set(field("GDD").match(/[A-Z]+(?:\.[A-Z0-9_]+)+/g) ?? [])];
  const after = t.mark === "x" ? runOf(b, t.kind, t.cycle, t.doc) : undefined;  // the screens after the build it was done in — in the Play tab
  return (
    <>
      <div className="ep-scrim" onClick={close} />
      <aside className="ep-panel" role="dialog" aria-label={k}>
        <div className="ep-top"><code>{k}</code><span className="lab">{st?.name ?? "No epic"}</span><button className="btn ghost" onClick={close} aria-label="Close">×</button></div>
        <div className="ep-body">
          <h2>{t.title}</h2>
          <div className="small muted"><i className={`dot ep-${cls}`} /> {word} · {t.kind === "playtest" ? `playtest ${t.doc.replace(/\.md$/, "")}` : `cycle ${t.cycle}${cyc ? ` — ${cyc.name}` : ""}`}</div>
          {what ? <div className="ep-sec"><span className="lab">What it is</span><div className="v"><Md text={what} /></div></div> : null}
          {change ? <div className="ep-sec"><span className="lab">How it will change</span><div className="v"><Md text={change} /></div></div> : null}
          {done ? <div className="ep-sec"><span className="lab">What changed</span><div className="v"><Md text={done} /></div></div> : null}
          {stuck ? <div className="ep-sec bad"><span className="lab">{field("Blocked") ? "Blocked" : "Dropped"}</span><div className="v"><Md text={stuck} /></div></div> : null}
          {!what && !change && !done ? <div className="small muted">Planned before tasks said in plain words what they are.</div> : null}
          {after && show ? (
            <div className="ep-sec"><span className="lab">Screens after it</span>
              <button className="btn ghost" onClick={() => show(after.id, after.stops.some((s) => s.stage === st?.name) ? st!.name : null)}>{after.what} · {after.at} — Play →</button>
            </div>
          ) : null}
          {ids.length ? <div className="ep-sec"><span className="lab">GDD</span><div className="chips">{ids.map((x) => <code key={x} className="tchip">{x}</code>)}</div></div> : null}
        </div>
      </aside>
    </>
  );
}
