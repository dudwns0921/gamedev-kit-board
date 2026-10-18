"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { at, type Act, type Inbox, type Ask, type Board, type Item, type Model, type Stage, type St, type Summary, type Task, type Used } from "@/lib/board";
import ThemePicker from "../../theme-picker";
import NotNeeded, { type Run } from "./not-needed";
import ReviewTab, { type Zoom } from "./review";
import { SessionPill, SessionToasts } from "./session";

// One game, drawn from the data the kit sends. The page holds one connection (/g/<game>/events) and is told the moment a newer board
// arrives or the game's inbox changes — it redraws in place, the open tab and stage stay. Nothing asks on a clock.
// "Refresh" reads both once more and reconnects — for when the connection dropped (a sleeping laptop, a phone on the tunnel).
const TABS = ["overview", "review", "stages", "cycles", "assets"] as const;
type Tab = (typeof TABS)[number];
const WORD: Record<St, string> = { done: "Done", temp: "Placeholder", none: "Not made", bad: "Problem" };
const NONE: Inbox = { sent: [], taken: [], relayed: [], untaken: false };

export default function Dashboard({ first, tab: firstTab }: { first: Summary; tab: string }) {
  const [s, setS] = useState(first);
  const [box, setBox] = useState<Inbox>(NONE);
  const [fresh, setFresh] = useState(false);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState(0);
  const [tab, setTab] = useState<Tab>((TABS as readonly string[]).includes(firstTab) ? (firstTab as Tab) : "overview");
  const [stage, setStage] = useState<number | null>(null);
  const [cyc, setCyc] = useState<string | null>(null);  // the cycle open in the Cycles tab — the newest when none was picked
  const [zoom, setZoom] = useState<{ src: string; label: string } | null>(null);
  const b = s.board as Board;
  const file = useCallback((p: string) => (p ? `/g/${s.game}/${p}` : ""), [s.game]);
  const body = useRef<HTMLElement>(null);  // the part that scrolls — the bar and the tabs above it stay put
  const flash = useRef<ReturnType<typeof setTimeout> | null>(null);
  const has = useRef(first.received);

  const take = useCallback((next: Summary) => {
    if (!next.board || next.received === has.current) return;
    has.current = next.received;
    setS(next);
    setFresh(true);
    if (flash.current) clearTimeout(flash.current);
    flash.current = setTimeout(() => setFresh(false), 4000);
  }, []);

  // where the inbox and the session stand, read once as the page opens — the connection below tells every change after
  // (and a page whose connection a proxy holds back still says whether a session is listening)
  useEffect(() => {
    if (!s.local) return;
    fetch(`/g/${s.game}/inbox`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((x) => x && setBox((b) => (b === NONE ? { ...NONE, ...(x as Inbox) } : b))).catch(() => {});
  }, [s.game, s.local]);

  // The live connection — and it comes back by itself: a dashboard restarted (an update), a phone that slept or left the tab,
  // a network that dropped. Each time it opens, what changed meanwhile is read at once.
  useEffect(() => {
    const es = new EventSource(`/g/${s.game}/events`);
    let again: ReturnType<typeof setTimeout> | null = null;
    const catchUp = () => {
      fetch(`/g/${s.game}/summary`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((x) => x && take(x as Summary)).catch(() => {});
      if (s.local) fetch(`/g/${s.game}/inbox`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((x) => x && setBox({ ...NONE, ...(x as Inbox) })).catch(() => {});
    };
    let opened = false;
    es.onopen = () => { setLive(true); if (opened) catchUp(); opened = true; };
    es.onerror = () => {
      setLive(es.readyState === EventSource.OPEN);
      if (es.readyState === EventSource.CLOSED && !again) again = setTimeout(() => setLink((n) => n + 1), 3000);  // the browser gave up — open a new one
    };
    const back = () => {
      if (document.visibilityState !== "visible" || es.readyState === EventSource.OPEN) return;
      setLink((n) => n + 1);
    };
    document.addEventListener("visibilitychange", back);
    addEventListener("online", back);
    addEventListener("pageshow", back);
    es.addEventListener("summary", (e) => take(JSON.parse((e as MessageEvent).data) as Summary));
    es.addEventListener("inbox", (e) => setBox({ ...NONE, ...(JSON.parse((e as MessageEvent).data) as Inbox) }));
    if (link) catchUp();  // a connection opened again: read what it missed
    return () => {
      es.close();
      if (again) clearTimeout(again);
      document.removeEventListener("visibilitychange", back);
      removeEventListener("online", back);
      removeEventListener("pageshow", back);
    };
  }, [s.game, s.local, take, link]);

  const refresh = useCallback(async () => {
    setBusy(true);
    const [sum, inbox] = await Promise.all([
      fetch(`/g/${s.game}/summary`, { cache: "no-store" }).catch(() => null),
      s.local ? fetch(`/g/${s.game}/inbox`, { cache: "no-store" }).catch(() => null) : null,
    ]);
    if (sum?.ok) take((await sum.json()) as Summary);
    if (inbox?.ok) setBox({ ...NONE, ...((await inbox.json()) as Inbox) });
    if (!live) setLink((n) => n + 1); // the connection had dropped — open it again
    setBusy(false);
  }, [s.game, s.local, take, live]);

  // Acting on the game is offered only when its board came from this machine
  const run: Run | null = s.local ? async (a: Act) => {
    const r = await fetch(`/g/${s.game}/act`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(a) }).catch(() => null);
    const got = r ? ((await r.json().catch(() => null)) as { ok: boolean; said: string } | null) : null;
    return got ?? { ok: false, said: "The dashboard did not answer." };
  } : null;

  useEffect(() => {
    const off = (ev: KeyboardEvent) => ev.key === "Escape" && setZoom(null);
    addEventListener("keydown", off);
    return () => removeEventListener("keydown", off);
  }, []);

  function go(t: Tab, st: number | null = null, cy?: string) {
    setTab(t);
    if (cy) setCyc(cy);
    if (st !== null) setStage(st);
    const u = new URL(location.href);
    u.searchParams.set("tab", t);
    history.replaceState(null, "", u);
    body.current?.scrollTo({ top: 0 });
  }

  const flow = b.stages.filter((x) => !x.common);
  const z: Zoom = (src, label) => setZoom({ src, label });
  const counts = { review: b.review.filter((i) => !i.later).length, problems: s.counts.problems };  // what was put off to a later cycle waits on no one now

  return (
    <>
      <div className="screen">
      <header className="topbar">
        <div className="in">
          <a className="btn ghost" href="/" aria-label="All games">←</a>
          <div className="title">
            <span className="lab">{s.now ? `Cycle ${s.now.cycle} · ${s.now.stage}` : "No cycle yet"}</span>
            <b>{s.name}</b>
          </div>
          <div className="right">
            <SessionPill box={box} />
            <span className={`live${fresh ? " new" : ""}${live ? "" : " off"}`} title={live ? `Drawn ${s.drawn} · follows the game as it changes` : "Not connected — Refresh to reconnect"}>
              <i /><span className="hide-sm" suppressHydrationWarning>{fresh ? "Updated just now" : `Updated ${at(s.received)}`}</span>
            </span>
            <button className="btn ghost" onClick={refresh} disabled={busy} aria-label="Refresh" title="Read the board and the inbox again">{busy ? "…" : "↻"}</button>
            <ThemePicker />
          </div>
        </div>
      </header>
      <div className="tabbar">
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => go(t)}>
              {t[0].toUpperCase() + t.slice(1)}
              {t === "review" && counts.review ? <span className="count">{counts.review}</span> : null}
            </button>
          ))}
        </nav>
      </div>
      <main className="body" ref={body}>
       <div className="wrap">
        {s.now?.pause ? (
          <div className="pause small">The game&apos;s conversation is long{s.now.context ? ` — about ${Math.round(s.now.context / 1000)}k tokens, re-read every turn` : ""} — and the cycle is at a break.
            A good moment to type <code>/clear</code> then <code>/gamedev-kit:cycle next</code> in the session: same window, still connected to this dashboard.</div>
        ) : null}

        {tab === "overview" ? <Overview s={s} b={b} flow={flow} counts={counts} file={file} go={go} run={run} /> : null}
        {tab === "review" ? <ReviewTab game={s.game} box={box} items={b.review} file={file} zoom={z} run={run} /> : null}
        {tab === "stages" ? <Stages b={b} sel={stage ?? flow[0]?.i ?? 0} pick={setStage} file={file} zoom={z} run={run} go={go} /> : null}
        {tab === "cycles" ? <Cycles b={b} sel={cyc ?? b.cycles[b.cycles.length - 1]?.num ?? ""} pick={setCyc} file={file} zoom={z} go={go} /> : null}
        {tab === "assets" ? <Assets a={b.assets} file={file} zoom={z} /> : null}
       </div>
      </main>
      </div>
      <SessionToasts box={box} />
      {zoom ? (
        <div className="zoombox" onClick={() => setZoom(null)} role="dialog" aria-label={zoom.label}>
          <img src={zoom.src} alt="" />
          <span>{zoom.label}</span>
        </div>
      ) : null}
    </>
  );
}

// ── pieces ──────────────────────────────────────────────────────────

function Ring({ p, big }: { p: number | null; big?: boolean }) {
  return <div className={big ? "ring big" : "ring"} style={{ ["--p" as string]: p ?? 0 }}><b>{p ?? "—"}</b></div>;
}

function tally(items: Item[]) {
  const c = { done: 0, temp: 0, none: 0, bad: 0 };
  items.forEach((i) => c[i.st]++);
  return c;
}

function Meter({ items }: { items: Item[] }) {
  const c = tally(items);
  return (
    <div className="meter" title={`done ${c.done} · placeholder ${c.temp} · not made ${c.none} · problem ${c.bad}`}>
      {(["done", "temp", "none", "bad"] as St[]).map((k) => (c[k] ? <i key={k} className={`st-${k}`} style={{ flex: c[k] }} /> : null))}
    </div>
  );
}

function Legend() {
  return (
    <div className="legend">
      {(["done", "temp", "none", "bad"] as St[]).map((k) => <span key={k}><i className={`dot st-${k}`} />{WORD[k]}</span>)}
    </div>
  );
}

// What is still open in a stage, in words a card can carry — problems · not made · placeholders · not yet checked by playing.
function opens(st: Stage) {
  const made = ["function", "art", "sound"].flatMap((k) => st.lanes[k] ?? []);
  const all = Object.values(st.lanes).flat();
  return {
    bad: all.filter((i) => i.st === "bad").length,
    none: made.filter((i) => i.st === "none").length,
    temp: made.filter((i) => i.st === "temp").length,
    check: (st.lanes.verified ?? []).filter((i) => i.st === "temp" || i.st === "none").length,
    all: all.length,
  };
}

function OpenChips({ st }: { st: Stage }) {
  const o = opens(st);
  const chips: [string, string, number][] = [
    ["bad", `${o.bad} problem${o.bad > 1 ? "s" : ""}`, o.bad], ["bad", `${st.open.length} undecided`, st.open.length],
    ["", `${o.none} not made`, o.none], ["warn", `${o.temp} placeholder${o.temp > 1 ? "s" : ""}`, o.temp], ["acc", `${o.check} to check`, o.check],
  ];
  const shown = chips.filter(([, , n]) => n);
  return (
    <div className="chips">
      {shown.length ? shown.map(([cls, w]) => <span key={w} className={`chip ${cls}`}>{w}</span>)
        : <span className="chip ok">{o.all ? "✓ all made and checked" : "nothing counted yet"}</span>}
    </div>
  );
}

const STEPS = ["Goal", "Spec", "Design", "Plan", "Build", "Play"];
const MARK: Record<string, [string, string]> = { x: ["done", "✓"], "!": ["blocked", "!"], " ": ["open", "○"], ">": ["doing", "▶"], "-": ["dropped", "–"] };
const total = (t: { done: number; open: number; blocked: number; doing?: number }) => t.done + t.open + t.blocked + (t.doing ?? 0);

function Overview({ s, b, flow, counts, file, go }: {
  s: Summary; b: Board; flow: Stage[]; counts: { review: number; problems: number };
  file: (p: string) => string; go: (t: Tab, st?: number | null, cy?: string) => void; run: Run | null;
}) {
  const now = b.cycles[b.cycles.length - 1];
  const rest = b.stages.find((x) => x.common);
  const stray = rest ? Object.values(rest.lanes).reduce((n, l) => n + l.length, 0) : 0;
  const steps = b.steps ?? STEPS;
  const at = now ? steps.indexOf(now.stage) : -1;
  const tasks = (now?.list ?? []).filter((t) => t.mark !== "-");
  const all = { done: s.counts.done ?? 0, temp: s.counts.placeholders, none: s.counts.not_made, bad: s.counts.problems };
  const loops = flow.filter((x) => x.loop).map((x) => flow.indexOf(x));
  return (
    <>
      {now ? (
        <section className="card now">
          <div className="what">
            <span className="lab">Now · cycle {now.num} — {now.name}</span>
            <div className="steps">
              {steps.map((k, i) => (
                <span key={k} className={`step${k === now.stage ? " on" : now.skipped?.includes(k) ? " skip" : now.stage === "Closed" || (at >= 0 && i < at) ? " past" : ""}`}>{k}</span>
              ))}
            </div>
            <h2>{now.line || now.name}</h2>
            {now.line && now.goal ? <p className="small muted clamp">{now.goal}</p> : null}
            {tasks.length ? (
              <>
                <span className="lab">Tasks {tasks.filter((t) => t.mark === "x").length}/{tasks.length}
                  {tasks.some((t) => t.mark === ">") ? <> · now: {tasks.filter((t) => t.mark === ">").map((t) => t.num).join(" · ")}</> : null}
                  {" · "}<a className="more" href="?tab=cycles" onClick={(e) => { e.preventDefault(); go("cycles", null, now.num); }}>all tasks →</a></span>
                <ul className="tasks">
                  {tasks.slice(0, 8).map((t) => {
                    const [cls, sign] = MARK[t.mark] ?? MARK[" "];
                    return <li key={t.num} className={cls} title={t.title}><i>{sign}</i><b>{t.num}</b><span>{t.title}</span></li>;
                  })}
                  {tasks.length > 8 ? <li className="more">+{tasks.length - 8} more</li> : null}
                </ul>
              </>
            ) : null}
          </div>
          {counts.review ? (
            <a className="turn" href="?tab=review" onClick={(e) => { e.preventDefault(); go("review"); }}>
              <b>{counts.review}</b><span>waiting on you<small>decisions · checks by playing · to-dos</small></span><em>Review →</em>
            </a>
          ) : (
            <div className="turn calm"><b>0</b><span>nothing waits on you<small>the session is on it</small></span></div>
          )}
        </section>
      ) : null}

      <section className="sec">
        <div className="sec-h"><h2>The game</h2><span className="lab">in the order the player meets it — each stage as its latest screen</span></div>
        <div className="film" style={{ ["--n" as string]: flow.length || 1 }}>
          {loops.length ? <div className="loop" style={{ gridColumn: `${loops[0] + 1} / ${loops[loops.length - 1] + 2}` }}><span>repeats</span></div> : null}
          {flow.map((st) => {
            const busy = now ? st.work.filter((w) => w.cycle === now.num).flatMap((w) => w.tasks) : [];  // what the cycle in hand does in this stage
            return (
            <button key={st.i} className={`card link shotcard${opens(st).bad ? " warn" : ""}${busy.length ? " busy" : ""}`} onClick={() => go("stages", st.i)}>
              {st.image ? (
                <div className="shot" style={{ backgroundImage: `url(${file(st.image)})` }}>
                  {st.shot ? <span className={`age${st.shot.behind >= 2 ? " old" : ""}`}>cycle {st.shot.cycle}{st.shot.behind >= 2 ? ` · ${st.shot.behind} cycles old` : ""}</span> : null}
                </div>
              ) : <div className="shot none"><span>No screen yet<br />shot at the next Play</span></div>}
              <div className="in">
                {busy.length ? <span className="busy">in cycle {now?.num} · {busy.map((t) => (t.mark === ">" ? "▶ " : "") + t.num).join(" · ")}</span> : null}
                <span className="lab">{String(st.i + 1).padStart(2, "0")}{st.loop ? " · loop" : ""}{st.complete !== null ? ` · ${st.complete}%` : ""}</span>
                <h3>{st.name}</h3>
                {st.about ? <div className="small muted">{st.about}</div> : null}
                <div className="bar"><i style={{ width: `${st.complete ?? 0}%` }} /></div>
                <OpenChips st={st} />
              </div>
            </button>
            );
          })}
        </div>
      </section>

      <section className="sec">
        <div className="sec-h"><h2>What is left</h2><span className="lab">counts of what is still open</span></div>
        <div className="left">
          <div className="card kpi gold"><span className="lab">Complete</span><b>{s.complete}%</b><small>average of the stages</small></div>
          <a className={`card kpi${counts.review ? " you" : ""}`} href="?tab=review" onClick={(e) => { e.preventDefault(); go("review"); }}>
            <span className="lab">Waiting on you</span><b>{counts.review}</b>
          </a>
          <div className={`card kpi${counts.problems ? " alert" : ""}`}><span className="lab">Problems</span><b>{counts.problems}</b></div>
          <div className="card kpi"><span className="lab">Not made</span><b>{s.counts.not_made}</b></div>
          <div className="card kpi warn"><span className="lab">Placeholders</span><b>{s.counts.placeholders}</b></div>
          <div className="card whole">
            <div className="meter big">
              {(["done", "temp", "none", "bad"] as St[]).map((k) => (all[k] ? <i key={k} className={`st-${k}`} style={{ flex: all[k] }} /> : null))}
            </div>
            <div className="legend">
              {(["done", "temp", "none", "bad"] as St[]).map((k) => <span key={k}><i className={`dot st-${k}`} />{all[k]} {WORD[k].toLowerCase()}</span>)}
            </div>
            {stray && rest ? (
              <a className="small stray" href="?tab=stages" onClick={(e) => { e.preventDefault(); go("stages", rest.i); }}>{stray} in no stage yet — place them →</a>
            ) : null}
          </div>
        </div>
      </section>

      {b.cycles.length > 1 ? (
        <section className="sec">
          <div className="sec-h"><h2>Cycles</h2><span className="lab">what each one looked like</span></div>
          <div className="cycstrip">
            {[...b.cycles].reverse().slice(0, 6).map((c) => (
              <button key={c.num} className="cyc" onClick={() => go("cycles", null, c.num)}>
                {c.shot ? <div className="shot" style={{ backgroundImage: `url(${file(c.shot)})` }} /> : <div className="shot none"><span>no screen kept</span></div>}
                <b>{c.num} · {c.name}</b>
                <small className="muted">{c.stage} · tasks {c.tasks.done}/{total(c.tasks)}</small>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <div className="small muted">Drawn {s.drawn} · every state is read as written in the GDD table, asset records, cycle and playtest documents.</div>
    </>
  );
}

function AskRow({ q, run }: { q: Ask; run: Run | null }) {
  return (
    <li>
      <i className="dot st-bad" />
      <div className="t">
        <b>{q.title}</b>
        <small>{q.text ? q.text + " · " : ""}{q.from}</small>
        {q.decision?.key ? <NotNeeded run={run} what={q.decision.num} item={q.decision.key} /> : null}
      </div>
    </li>
  );
}

function ItemRow({ i, file, used }: { i: Item; file: (p: string) => string; used?: Used }) {
  return (
    <li>
      <i className={`dot st-${i.st}`} title={WORD[i.st]} />
      {i.audio ? <Play src={file(i.audio)} /> : null}
      <div className="t">
        <span>{i.code ? <code>{i.code}</code> : null}<b>{i.title}</b></span>
        {i.sub || i.note || i.tags.length ? <small>{[i.sub, i.note, i.tags.join(" · ")].filter(Boolean).join(" · ")}</small> : null}
        <UsedIn u={used} />
      </div>
    </li>
  );
}

function Play({ src }: { src: string }) {
  const [a, setA] = useState<HTMLAudioElement | null>(null);
  useEffect(() => () => a?.pause(), [a]);
  return (
    <button className={a ? "play on" : "play"} aria-label={a ? "Stop" : "Play"} onClick={() => {
      if (a) { a.pause(); setA(null); return; }
      const n = new Audio(src);
      n.onended = () => setA(null);
      n.play();
      setA(n);
    }}>{a ? "■" : "▶"}</button>
  );
}

function Lane({ label, items, file, zoom }: { label: string; items: Item[]; file: (p: string) => string; zoom: Zoom }) {
  const todo = items.filter((i) => i.st !== "done");
  const done = items.filter((i) => i.st === "done");
  const pics = items.filter((i) => i.img);
  return (
    <section className="card sec">
      <div className="sec-h"><h3>{label}</h3><span className="lab" style={{ marginLeft: "auto" }}>{items.length ? `${done.length}/${items.length}` : "none"}</span></div>
      {items.length ? <Meter items={items} /> : <span className="small muted">Nothing read for this stage.</span>}
      {pics.length ? (
        <div className="thumbs">
          {pics.map((i, n) => (
            <div key={n} className="thumb" title={i.note || i.sub}>
              <i className={`dot st-${i.st}`} />
              <button className="im" style={{ backgroundImage: `url(${file(i.img)})` }} onClick={() => zoom(file(i.img), i.title)} aria-label={i.title} />
              <span className="nm">{i.title}</span>
            </div>
          ))}
        </div>
      ) : null}
      {todo.filter((i) => !i.img).length ? <ul className="list">{todo.filter((i) => !i.img).map((i, n) => <ItemRow key={n} i={i} file={file} />)}</ul> : null}
      {done.filter((i) => !i.img).length ? (
        <details open={!todo.length && done.length <= 8}>
          <summary>Show {done.filter((i) => !i.img).length} done</summary>
          <ul className="list">{done.filter((i) => !i.img).map((i, n) => <ItemRow key={n} i={i} file={file} />)}</ul>
        </details>
      ) : null}
    </section>
  );
}

function Stages({ b, sel, pick, file, zoom, run, go }: {
  b: Board; sel: number; pick: (i: number) => void; file: (p: string) => string; zoom: Zoom; run: Run | null; go: (t: Tab, st?: number | null, cy?: string) => void;
}) {
  const st = b.stages.find((x) => x.i === sel) ?? b.stages[0];
  if (!st) return <div className="empty">No stages read yet.</div>;
  return (
    <>
      <div className="filters">
        {b.stages.map((x) => (
          <button key={x.i} className={x.i === st.i ? "on" : ""} onClick={() => pick(x.i)}>
            {x.common ? x.name : `${String(x.i + 1).padStart(2, "0")} ${x.name}`}{x.complete !== null ? ` · ${x.complete}%` : ""}
          </button>
        ))}
      </div>
      <div className="card" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <Ring p={st.complete} big />
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="lab">{st.common ? "In no stage — not counted in the %" : `Stage ${String(st.i + 1).padStart(2, "0")}${st.loop ? " · loop" : ""}`}</span>
          <h1>{st.name}</h1>
          {st.about ? <div className="muted">{st.about}</div> : null}
        </div>
        <Legend />
      </div>
      <div className="cols">{b.lanes.map((l) => <Lane key={l.key} label={l.label} items={st.lanes[l.key] ?? []} file={file} zoom={zoom} />)}</div>
      <div className="cols">
        <section className="card sec">
          <div className="sec-h"><h3>Undecided</h3><span className="lab" style={{ marginLeft: "auto" }}>{st.open.length}</span></div>
          {st.open.length ? (
            <ul className="list">{st.open.map((q, n) => <AskRow key={n} q={q} run={run} />)}</ul>
          ) : <span className="small muted">None.</span>}
        </section>
        <section className="card sec">
          <h3>Tasks that touched this stage</h3>
          {st.work.length ? st.work.map((w) => (
            <div key={w.cycle}>
              <a className="lab more" href="?tab=cycles" style={{ display: "block", margin: "4px 0 6px" }} onClick={(e) => { e.preventDefault(); go("cycles", null, w.cycle); }}>Cycle {w.cycle} — {w.name} · {w.stage} →</a>
              {w.tasks.map((t) => <span key={t.num} className={`task${t.mark === "x" ? " x" : t.mark === "!" ? " blk" : ""}`} title={t.did}><b className="mono">{t.num}</b>{t.title}</span>)}
            </div>
          )) : <span className="small muted">None.</span>}
        </section>
      </div>
    </>
  );
}

// A stage named in `cycle.py shot` — its name on the board, or a part of it (the kit matches the same way).
function fits(said: string, name: string) {
  const a = said.toLowerCase().split(/\s+/).join(" "), n = name.toLowerCase().split(/\s+/).join(" ");
  return !!a && (a === n || n.includes(a) || a.includes(n));
}

function Cycles({ b, sel, pick, file, zoom, go }: {
  b: Board; sel: string; pick: (c: string) => void; file: (p: string) => string; zoom: Zoom; go: (t: Tab, st?: number | null, cy?: string) => void;
}) {
  const c = b.cycles.find((x) => x.num === sel) ?? b.cycles[b.cycles.length - 1];
  if (!c) return <div className="empty">No cycle yet.</div>;
  const steps = b.steps ?? STEPS;
  const at = steps.indexOf(c.stage);
  const list = c.list ?? [];
  const waves = [...new Set(list.map((t) => t.wave ?? 0))].sort((x, y) => x - y);
  const worked = (c.stages ?? []).map((i) => b.stages.find((x) => x.i === i)).filter((x): x is Stage => !!x);
  const shotOf = (st: Stage) => (c.shots ?? []).find((sh) => fits(sh.stage, st.name))?.img;
  const loose = (c.shots ?? []).filter((sh) => !worked.some((st) => fits(sh.stage, st.name)));
  return (
    <>
      <div className="filters">
        {[...b.cycles].reverse().map((x) => (
          <button key={x.num} className={x.num === c.num ? "on" : ""} onClick={() => pick(x.num)}>{x.num} {x.name}</button>
        ))}
      </div>
      <section className="card sec">
        <span className="lab">Cycle {c.num} · {c.stage}{c.start ? ` · started ${c.start}` : ""}</span>
        <div className="steps">
          {steps.map((k, i) => (
            <span key={k} className={`step${k === c.stage ? " on" : c.skipped?.includes(k) ? " skip" : c.stage === "Closed" || (at >= 0 && i < at) ? " past" : ""}`}>{k}</span>
          ))}
        </div>
        <h1>{c.line || c.name}</h1>
        {c.goal ? <div className="small muted goalwords">{c.goal}</div> : null}
        <div className="chips">
          <span className="chip acc">Tasks {c.tasks.done}/{total(c.tasks)}</span>
          {c.tasks.doing ? <span className="chip acc">now {c.tasks.doing}</span> : null}
          {c.tasks.blocked ? <span className="chip bad">Blocked {c.tasks.blocked}</span> : null}
          {c.decisions.all ? <span className="chip">Decisions {c.decisions.all - c.decisions.open}/{c.decisions.all}</span> : null}
        </div>
      </section>

      <div className="split">
        <section className="card sec">
          <div className="sec-h"><h3>What it did</h3><span className="lab">{list.length} tasks</span></div>
          {list.length ? waves.map((w) => (
            <div key={w}>
              {waves.length > 1 ? <div className="lab" style={{ margin: "6px 0 2px" }}>{w ? `Wave ${w}` : "No wave"}</div> : null}
              <ul className="tasklist">
                {list.filter((t) => (t.wave ?? 0) === w).map((t: Task) => {
                  const [cls, sign] = MARK[t.mark] ?? MARK[" "];
                  return (
                    <li key={t.num} className={cls}>
                      <i>{sign}</i>
                      <div className="t"><b><span className="mono">{t.num}</span> {t.title}</b>
                        {t.mark === ">" ? <small className="now">being worked on now</small> : null}
                        {t.blocked ? <small className="blk">Blocked: {t.blocked}</small> : null}
                        {t.did ? <small>{t.did}</small> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )) : <span className="small muted">No tasks yet — the plan comes after the spec and the design.</span>}
        </section>

        <aside className="sec">
          <div className="sec-h"><h3>Where in the game</h3><span className="lab">{worked.length} stages</span></div>
          {worked.length ? worked.map((st) => {
            const img = shotOf(st);
            return (
              <button key={st.i} className="card link where" onClick={() => go("stages", st.i)}>
                {img ? <div className="shot" style={{ backgroundImage: `url(${file(img)})` }}><span className="age">shot in cycle {c.num}</span></div>
                  : st.image ? <div className="shot dim" style={{ backgroundImage: `url(${file(st.image)})` }}><span className="age">no screen from this cycle</span></div> : null}
                <div className="in">
                  <span className="lab">{String(st.i + 1).padStart(2, "0")}</span>
                  <b>{st.name}</b>
                  <small className="muted">{st.work.find((w) => w.cycle === c.num)?.tasks.map((t) => t.num).join(" · ")}</small>
                </div>
              </button>
            );
          }) : <div className="card small muted">No stage read from its tasks.</div>}
          {loose.length ? (
            <div className="thumbs">
              {loose.map((sh) => (
                <div key={sh.img} className="thumb"><button className="im" style={{ backgroundImage: `url(${file(sh.img)})` }} onClick={() => zoom(file(sh.img), sh.stage)} aria-label={sh.stage} /><span className="nm">{sh.stage}</span></div>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}

function UsedIn({ u }: { u?: Used }) {
  if (!u) return null;
  return (
    <span className="used">
      {u.stage ? <>in <b>{u.stage}</b></> : "in no stage"}
      {u.code.length ? <> · {u.code.map((c) => <code key={c}>{c}</code>)}</> : <> · not named in code</>}
    </span>
  );
}

function Assets({ a, file, zoom }: { a: Board["assets"]; file: (p: string) => string; zoom: Zoom }) {
  // Every picture, model and sound in the game's asset folders, side by side — whoever made it. The kit makes none.
  return (
    <div className="split">
      <section className="sec">
        <div className="sec-h"><h2>Models · images</h2><span className="lab">{a.models.length}</span></div>
        {a.models.length ? (
          <div className="thumbs">
            {a.models.map((m) => (
              <div key={m.what} className="thumb" title={m.what}>
                {m.img ? <button className="im" style={{ backgroundImage: `url(${file(m.img)})` }} onClick={() => zoom(file(m.img), m.name)} aria-label={m.name} /> : <div className="im">model</div>}
                <span className="nm">{m.name}</span>
                <UsedIn u={m.used} />
              </div>
            ))}
          </div>
        ) : <div className="empty">No pictures or models in the asset folders yet.</div>}
      </section>
      <aside className="sec">
        <div className="sec-h"><h2>Sounds</h2><span className="lab">{a.sounds.length}</span></div>
        <div className="card">{a.sounds.length ? <ul className="list">{a.sounds.map((x, n) => <ItemRow key={n} i={x} file={file} used={x.used} />)}</ul> : <span className="small muted">None.</span>}</div>
      </aside>
    </div>
  );
}
