"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { at, type Act, type Inbox, type Ask, type Board, type Item, type Model, type Stage, type St, type Summary } from "@/lib/board";
import ThemePicker from "../../theme-picker";
import NotNeeded, { type Run } from "./not-needed";
import ReviewTab, { type Zoom } from "./review";

// One game, drawn from the data the kit sends. The page holds one connection (/g/<game>/events) and is told the moment a newer board
// arrives or the game's inbox changes — it redraws in place, the open tab and stage stay. Nothing asks on a clock.
// "Refresh" reads both once more and reconnects — for when the connection dropped (a sleeping laptop, a phone on the tunnel).
const TABS = ["overview", "review", "stages", "assets"] as const;
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
  const [zoom, setZoom] = useState<{ src: string; label: string } | null>(null);
  const b = s.board as Board;
  const file = useCallback((p: string) => (p ? `/g/${s.game}/${p}` : ""), [s.game]);
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

  useEffect(() => {
    const es = new EventSource(`/g/${s.game}/events`);
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(es.readyState === EventSource.OPEN);
    es.addEventListener("summary", (e) => take(JSON.parse((e as MessageEvent).data) as Summary));
    es.addEventListener("inbox", (e) => setBox({ ...NONE, ...(JSON.parse((e as MessageEvent).data) as Inbox) }));
    return () => es.close();
  }, [s.game, take, link]);

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

  function go(t: Tab, st: number | null = null) {
    setTab(t);
    if (st !== null) setStage(st);
    const u = new URL(location.href);
    u.searchParams.set("tab", t);
    history.replaceState(null, "", u);
    scrollTo({ top: 0 });
  }

  const flow = b.stages.filter((x) => !x.common);
  const z: Zoom = (src, label) => setZoom({ src, label });
  const counts = { review: b.review.length, problems: s.counts.problems };

  return (
    <>
      <header className="topbar">
        <div className="in">
          <a className="btn ghost" href="/" aria-label="All games">←</a>
          <div className="title">
            <span className="lab">{s.now ? `Cycle ${s.now.cycle} · ${s.now.stage}` : "No cycle yet"}</span>
            <b>{s.name}</b>
          </div>
          <div className="right">
            <span className={`live${fresh ? " new" : ""}${live ? "" : " off"}`} title={live ? `Drawn ${s.drawn} · follows the game as it changes` : "Not connected — Refresh to reconnect"}>
              <i /><span className="hide-sm" suppressHydrationWarning>{fresh ? "Updated just now" : `Updated ${at(s.received)}`}</span>
            </span>
            <button className="btn ghost" onClick={refresh} disabled={busy} aria-label="Refresh" title="Read the board and the inbox again">{busy ? "…" : "↻"}</button>
            <ThemePicker />
          </div>
        </div>
      </header>
      <main className="wrap">
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => go(t)}>
              {t[0].toUpperCase() + t.slice(1)}
              {t === "review" && counts.review ? <span className="count">{counts.review}</span> : null}
            </button>
          ))}
        </nav>

        {s.now?.pause ? (
          <div className="pause small">The game&apos;s conversation is long{s.now.context ? ` — about ${Math.round(s.now.context / 1000)}k tokens, re-read every turn` : ""} — and the cycle is at a break.
            A good moment to type <code>/clear</code> then <code>/gamedev-kit:cycle next</code> in the session: same window, still connected to this dashboard.</div>
        ) : null}

        {tab === "overview" ? <Overview s={s} b={b} flow={flow} counts={counts} file={file} go={go} run={run} /> : null}
        {tab === "review" ? <ReviewTab game={s.game} box={box} items={b.review} file={file} zoom={z} run={run} /> : null}
        {tab === "stages" ? <Stages b={b} sel={stage ?? flow[0]?.i ?? 0} pick={setStage} file={file} zoom={z} run={run} /> : null}
        {tab === "assets" ? <Assets a={b.assets} file={file} zoom={z} /> : null}
      </main>
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

function Lanes({ b, st }: { b: Board; st: Stage }) {
  return (
    <div className="lanes">
      {b.lanes.map((l) => {
        const items = st.lanes[l.key] ?? [];
        return [
          <span key={l.key + "n"}>{l.label}</span>,
          items.length ? <Meter key={l.key + "m"} items={items} /> : <div key={l.key + "m"} className="meter" />,
          <em key={l.key + "c"}>{items.length ? `${tally(items).done}/${items.length}` : "—"}</em>,
        ];
      })}
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

function Overview({ s, b, flow, counts, file, go, run }: {
  s: Summary; b: Board; flow: Stage[]; counts: { review: number; problems: number };
  file: (p: string) => string; go: (t: Tab, st?: number | null) => void; run: Run | null;
}) {
  const now = b.cycles[b.cycles.length - 1];
  const rest = b.stages.find((x) => x.common);
  return (
    <>
      <div className="kpis">
        <div className="card kpi"><span className="lab">Complete</span><b>{s.complete}%</b><small>average of the stages</small></div>
        <a className={`card kpi${counts.review ? " alert" : ""}`} href="?tab=review" onClick={(e) => { e.preventDefault(); go("review"); }}>
          <span className="lab">Waiting on you</span><b>{counts.review}</b><small>{counts.review ? "Review →" : "nothing to answer"}</small>
        </a>
        <div className={`card kpi${counts.problems ? " alert" : ""}`}><span className="lab">Problems</span><b>{counts.problems}</b></div>
        <div className="card kpi"><span className="lab">Not made</span><b>{s.counts.not_made}</b><small>placeholders {s.counts.placeholders}</small></div>
      </div>

      <div className="split">
        <section className="sec">
          <div className="sec-h"><h2>Stages</h2><span className="lab">in the order the player meets them</span><span style={{ marginLeft: "auto" }}><Legend /></span></div>
          <div className="flow">
            {flow.map((st) => (
              <button key={st.i} className="card link stage" onClick={() => go("stages", st.i)}>
                {st.image ? <div className="hero" style={{ backgroundImage: `url(${file(st.image)})` }} /> : null}
                <div className="top">
                  <Ring p={st.complete} />
                  <div style={{ minWidth: 0 }}>
                    <span className="lab">{String(st.i + 1).padStart(2, "0")}{st.loop ? " · loop" : ""}</span>
                    <h3>{st.name}</h3>
                  </div>
                </div>
                {st.about ? <div className="small muted">{st.about}</div> : null}
                <Lanes b={b} st={st} />
                {st.open.length ? <div className="chips"><span className="chip bad">Undecided {st.open.length}</span></div> : null}
              </button>
            ))}
          </div>
          {rest && Object.values(rest.lanes).some((l) => l.length) ? (
            <button className="card link stage" onClick={() => go("stages", rest.i)}>
              <div className="sec-h"><span className="lab">In no stage — not counted in the %</span></div>
              <h3>{rest.name} {Object.values(rest.lanes).reduce((n, l) => n + l.length, 0)}</h3>
              <Lanes b={b} st={rest} />
            </button>
          ) : null}
        </section>

        <aside className="sec">
          {now ? (
            <>
              <div className="sec-h"><h2>Now</h2></div>
              <div className="card sec">
                <span className="lab">Cycle {now.num} · {now.stage}</span>
                <h3>{now.name}</h3>
                {now.goal ? <div className="small muted">{now.goal.length > 220 ? now.goal.slice(0, 220) + "…" : now.goal}</div> : null}
                <div className="chips">
                  <span className="chip acc">Tasks {now.tasks.done}/{now.tasks.done + now.tasks.open + now.tasks.blocked}</span>
                  {now.tasks.blocked ? <span className="chip bad">Blocked {now.tasks.blocked}</span> : null}
                  {now.decisions.open ? <span className="chip bad">Decisions open {now.decisions.open}</span> : null}
                </div>
              </div>
            </>
          ) : null}
          <div className="sec-h"><h2>Undecided</h2><span className="lab">{b.asks.length}</span>
            <a className="more" href="?tab=review" onClick={(e) => { e.preventDefault(); go("review"); }}>Answer in Review →</a></div>
          <div className="card">
            {b.asks.length ? (
              <ul className="list">
                {b.asks.slice(0, 8).map((q, i) => <AskRow key={i} q={q} run={run} />)}
                {b.asks.length > 8 ? <li><button className="btn ghost" onClick={() => go("stages")}>+{b.asks.length - 8} more, by stage →</button></li> : null}
              </ul>
            ) : <span className="muted small">Nothing undecided.</span>}
          </div>
          {b.cycles.length > 1 ? (
            <>
              <div className="sec-h"><h2>Cycles</h2></div>
              <div className="card">
                <ul className="list">
                  {[...b.cycles].reverse().map((c) => (
                    <li key={c.num}>
                      <i className={`dot st-${c.stage === "Closed" ? "done" : "temp"}`} />
                      <div className="t"><b>{c.num} — {c.name}</b><small>{c.stage}{c.start ? ` · started ${c.start}` : ""} · tasks {c.tasks.done}/{c.tasks.done + c.tasks.open + c.tasks.blocked}</small></div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </aside>
      </div>
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

function ItemRow({ i, file }: { i: Item; file: (p: string) => string }) {
  return (
    <li>
      <i className={`dot st-${i.st}`} title={WORD[i.st]} />
      {i.audio ? <Play src={file(i.audio)} /> : null}
      <div className="t">
        <span>{i.code ? <code>{i.code}</code> : null}<b>{i.title}</b></span>
        {i.sub || i.note || i.tags.length ? <small>{[i.sub, i.note, i.tags.join(" · ")].filter(Boolean).join(" · ")}</small> : null}
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

function Stages({ b, sel, pick, file, zoom, run }: { b: Board; sel: number; pick: (i: number) => void; file: (p: string) => string; zoom: Zoom; run: Run | null }) {
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
              <div className="lab" style={{ margin: "4px 0 6px" }}>Cycle {w.cycle} — {w.name} · {w.stage}</div>
              {w.tasks.map((t) => <span key={t.num} className={`task${t.mark === "x" ? " x" : t.mark === "!" ? " blk" : ""}`} title={t.did}><b className="mono">{t.num}</b>{t.title}</span>)}
            </div>
          )) : <span className="small muted">None.</span>}
        </section>
      </div>
    </>
  );
}

const SHOW = [
  { id: "all", label: "All", hit: (_m: Model) => true },
  { id: "old", label: "Old style", hit: (m: Model) => m.old },
  { id: "image", label: "Image only", hit: (m: Model) => m.state === "image only" },
  { id: "approved", label: "Approved", hit: (m: Model) => m.state === "approved" },
  { id: "game", label: "In the game", hit: (m: Model) => m.state === "in the game" },
] as const;

function Assets({ a, file, zoom }: { a: Board["assets"]; file: (p: string) => string; zoom: Zoom }) {
  const [show, setShow] = useState<(typeof SHOW)[number]["id"]>("all");
  const rule = SHOW.find((x) => x.id === show)!;
  const shown = useMemo(() => a.models.filter(rule.hit), [a.models, rule]);
  return (
    <>
      <div className="split">
        <section className="sec">
          <div className="sec-h"><h2>Models · images</h2><span className="lab">{a.models.length}</span></div>
          <div className="filters">
            {SHOW.map((x) => {
              const n = a.models.filter(x.hit).length;
              return <button key={x.id} className={show === x.id ? "on" : ""} onClick={() => setShow(x.id)} disabled={!n && x.id !== "all"}>{x.label} {n}</button>;
            })}
          </div>
          {shown.length ? (
            <div className="thumbs">
              {shown.map((m) => (
                <div key={m.tool + m.name} className={m.old ? "thumb old" : "thumb"} title={m.what}>
                  <i className={`dot st-${m.st}`} />
                  {m.img ? <button className="im" style={{ backgroundImage: `url(${file(m.img)})` }} onClick={() => zoom(file(m.img), m.name)} aria-label={m.name} /> : <div className="im">no image</div>}
                  <span className="nm">{m.name}</span>
                  <div className="chips">
                    <span className="chip">{m.state}</span>
                    {m.old ? <span className="chip bad">old style</span> : null}
                    {m.sample ? <span className="chip acc">sample</span> : null}
                    {m.rejected ? <span className="chip warn">rejected {m.rejected}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="empty">No asset records.</div>}
          {a.loose.length ? (
            <details>
              <summary>In the game without a record — {a.loose.length} (pictures, models, sheets put in by hand)</summary>
              <div className="thumbs">
                {a.loose.map((m) => (
                  <div key={m.name + m.what} className="thumb" title={m.what}>
                    {m.img ? <button className="im" style={{ backgroundImage: `url(${file(m.img)})` }} onClick={() => zoom(file(m.img), m.name)} aria-label={m.name} /> : <div className="im">model</div>}
                    <span className="nm">{m.name}</span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </section>
        <aside className="sec">
          <div className="sec-h"><h2>Sounds</h2><span className="lab">{a.sounds.length}</span></div>
          <div className="card">{a.sounds.length ? <ul className="list">{a.sounds.map((x, n) => <ItemRow key={n} i={x} file={file} />)}</ul> : <span className="small muted">None.</span>}</div>
          <div className="sec-h"><h2>Basis</h2><span className="lab">attached to every asset</span></div>
          <div className="card sec small">
            <div><span className="lab">Art style</span><div>{a.style || <span className="muted">Empty — set it before the first asset.</span>}</div></div>
            {a.world ? <div><span className="lab">World</span><div>{a.world}</div></div> : null}
            {a.learned.length ? <div><span className="lab">Learned {a.learned.length}</span><ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{a.learned.map((x, n) => <li key={n}>{x}</li>)}</ul></div> : null}
            {a.sound ? <div><span className="lab">Sound style</span><div>{a.sound}</div></div> : null}
          </div>
        </aside>
      </div>
    </>
  );
}
