"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { at, handLabel, inHand, type Act, type Board, type Inbox, type Item, type St, type Summary } from "@/lib/board";
import ThemePicker from "../../theme-picker";
import { type Run } from "./not-needed";
import ReviewTab, { type Zoom } from "./review";
import { SessionPill, SessionToasts } from "./session";
import { Backlog, Epics, Sprint, TaskPanel, type OpenTask } from "./epics";
import { Plays, type PlayAt } from "./plays";
import { Now } from "./now";
import { Bible } from "./bible";

// One game, drawn from the data the kit sends. The page holds one connection (/g/<game>/events) and is told the moment a newer board
// arrives or the game's inbox changes — it redraws in place, the open tab and stage stay. Nothing asks on a clock.
// "Refresh" reads both once more and reconnects — for when the connection dropped (a sleeping laptop, a phone on the tunnel).
const TABS = ["now", "epics", "cycle", "play", "bible", "backlog", "review", "assets"] as const;
const WAS: Record<string, Tab> = { cycles: "cycle", overview: "epics", stages: "epics" };  // a link from before the tabs became epics · cycle · backlog
type Tab = (typeof TABS)[number];
const NONE: Inbox = { sent: [], taken: [], relayed: [], untaken: false };

export default function Dashboard({ first, tab: firstTab }: { first: Summary; tab: string }) {
  const [s, setS] = useState(first);
  const [box, setBox] = useState<Inbox>(NONE);
  const [fresh, setFresh] = useState(false);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState(0);
  const [tab, setTab] = useState<Tab>((TABS as readonly string[]).includes(firstTab) ? (firstTab as Tab) : WAS[firstTab] ?? "now");
  const [stage, setStage] = useState<number | null>(null);
  const [cyc, setCyc] = useState<string | null>(null);  // the cycle open in the Cycle tab — the newest when none was picked
  const [zoom, setZoom] = useState<{ src: string; label: string } | null>(null);
  const [task, setTask] = useState<string | null>(null);  // the task open in the side panel, by its key
  const [playAt, setPlayAt] = useState<PlayAt>({ run: null, stage: null });  // the run open in the Play tab (the newest when none was picked), and a stage to show
  const b = s.board as Board;
  const openTask: OpenTask = useCallback((k: string) => setTask(k), []);
  const closeTask = useCallback(() => setTask(null), []);
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

  const z: Zoom = (src, label) => setZoom({ src, label });
  const counts = { review: b.review.filter((i) => !i.later).length, problems: s.counts.problems };
  const waitingLater = (b.backlog ?? []).filter((x) => x.mark === " ").length;  // what was put off to a later cycle waits on no one now

  return (
    <>
      <div className="screen">
      <header className="topbar">
        <div className="in">
          <a className="btn ghost" href="/" aria-label="All games">←</a>
          <div className="title">
            <span className="lab">{handLabel(s)}</span>
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
              {t === "cycle" && s.now ? (inHand(s).length > 1 ? "Cycles" : `Cycle ${s.now.cycle}`) : t[0].toUpperCase() + t.slice(1)}
              {t === "review" && counts.review ? <span className="count">{counts.review}</span> : null}
              {t === "backlog" && waitingLater ? <span className="count calm">{waitingLater}</span> : null}
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

        {tab === "now" ? <Now s={s} b={b} open={openTask} review={() => go("review")} cycle={(n) => go("cycle", null, n)} /> : null}
        {tab === "epics" ? <Epics b={b} file={file} open={openTask} sel={stage} pick={setStage} zoom={z} under={task !== null} /> : null}
        {tab === "cycle" ? <Sprint b={b} sel={cyc ?? b.cycles[b.cycles.length - 1]?.num ?? ""} pick={setCyc} open={openTask} waiting={counts.review} review={() => go("review")} hand={inHand(s)} /> : null}
        {tab === "play" ? <Plays b={b} file={file} zoom={z} at={playAt} pick={setPlayAt} /> : null}
        {tab === "bible" ? <Bible b={b} file={file} zoom={z} /> : null}
        {tab === "backlog" ? <Backlog b={b} /> : null}
        {tab === "review" ? <ReviewTab game={s.game} box={box} items={b.review} file={file} zoom={z} run={run} /> : null}
        {tab === "assets" ? <Assets b={b} file={file} zoom={z} go={go} /> : null}
       </div>
      </main>
      </div>
      <SessionToasts box={box} />
      {task ? <TaskPanel b={b} k={task} close={closeTask} show={(run, stage) => { setPlayAt({ run, stage }); setTask(null); go("play"); }} /> : null}
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

function tally(items: Item[]) {
  const c = { done: 0, temp: 0, none: 0, bad: 0 };
  items.forEach((i) => c[i.st]++);
  return c;
}

const STATE: Record<St, string> = { done: "done", temp: "placeholder", none: "not made", bad: "problem" };

// One asset as a line: a picture or a play button, its name, its state when not done, what it is.

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

function Assets({ b, file, zoom, go }: { b: Board; file: (p: string) => string; zoom: Zoom; go: (t: Tab, st?: number | null, cy?: string) => void }) {
  // Every asset, by the stage of play it is in (in the order the player meets them): what it is, how far, which part, which cycle listed it.
  const [state, setState] = useState<St | "all">("all");
  const [kind, setKind] = useState<"all" | "art" | "sound">("all");
  const all = b.stages.flatMap((st) => (["art", "sound"] as const).flatMap((k) => (st.lanes[k] ?? []).map((i) => ({ st, k, i }))));
  const seen = new Set(all.map((x) => x.i.title));
  const pictures = b.assets.models.filter((m) => m.img && !seen.has(m.name.split(".")[0]));
  const count = (s: St) => all.filter((x) => x.i.st === s && (kind === "all" || x.k === kind)).length;
  const shown = (x: { k: string; i: Item }) => (state === "all" || x.i.st === state) && (kind === "all" || x.k === kind);
  return (
    <>
      <div className="filters">
        <button className={state === "all" ? "on" : ""} onClick={() => setState("all")}>All {all.filter((x) => kind === "all" || x.k === kind).length}</button>
        {(["none", "temp", "done"] as St[]).map((s) => <button key={s} className={state === s ? "on" : ""} onClick={() => setState(s)}>{STATE[s][0].toUpperCase() + STATE[s].slice(1)} {count(s)}</button>)}
        <span style={{ width: 12 }} />
        {([["all", "Every kind"], ["art", "Models · pictures"], ["sound", "Sounds"]] as const).map(([k, w]) => <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{w}</button>)}
      </div>
      <section className="card flush">
        <div className="tablewrap">
          <table className="tbl">
            <thead><tr><th></th><th>Asset</th><th>Part</th><th>Cycle</th><th>State</th><th>In code</th></tr></thead>
            <tbody>
              {b.stages.map((st) => {
                const here = all.filter((x) => x.st.i === st.i && shown(x));
                if (!here.length) return null;
                const looks = st.lanes.art ?? [], sounds = st.lanes.sound ?? [];
                return [
                  <tr key={`s${st.i}`} className="group stagegroup">
                    <td colSpan={6}>
                      <button className="mini" onClick={() => go("epics", st.i)}>
                        <b>{st.common ? "In no stage yet" : `${String(st.i + 1).padStart(2, "0")} ${st.name}`}</b>
                      </button>
                      <span className="muted small">Looks {tally(looks).done}/{looks.length} · Sound {tally(sounds).done}/{sounds.length}</span>
                    </td>
                  </tr>,
                  ...here.map(({ i }) => (
                    <tr key={`${st.i}-${i.title}`} className={i.st === "done" ? "" : "open"}>
                      <td className="icon">{i.audio ? <Play src={file(i.audio)} /> : i.img ? <button className="athumb" style={{ backgroundImage: `url(${file(i.img)})` }} onClick={() => zoom(file(i.img), i.title)} aria-label={i.title} /> : <span className="athumb none">{i.sub.toLowerCase().includes("model") ? "3D" : ""}</span>}</td>
                      <td className="what"><b>{i.title}</b>{i.what ? <small className="what" title={i.what}>{i.what}</small> : i.sub ? <small className="what">{i.sub}</small> : null}</td>
                      <td>{i.part ? <span className="chip">{i.part}</span> : <span className="muted">—</span>}</td>
                      <td>{i.cycle ? <span className="tchip">{i.cycle}</span> : <span className="muted">—</span>}</td>
                      <td><span className={`chip ${i.st === "done" ? "ok" : i.st === "temp" ? "warn" : i.st === "bad" ? "bad" : "none"}`}>{STATE[i.st]}</span></td>
                      <td>{i.used_in?.length ? <details className="code"><summary>{i.used_in.length} file{i.used_in.length > 1 ? "s" : ""}</summary>{i.used_in.map((c) => <code key={c}>{c}</code>)}</details> : <span className="muted">—</span>}</td>
                    </tr>
                  )),
                ];
              })}
            </tbody>
          </table>
        </div>
      </section>
      {pictures.length && (state === "all" || state === "done") && kind !== "sound" ? (
        <section className="card sec">
          <div className="sec-h"><h3>Other pictures</h3><span className="lab">in the asset folders, listed by no cycle</span></div>
          <div className="thumbs">{pictures.map((m) => <div key={m.what} className="thumb"><button className="im" style={{ backgroundImage: `url(${file(m.img)})` }} onClick={() => zoom(file(m.img), m.name)} aria-label={m.name} /><span className="nm">{m.name}</span></div>)}</div>
        </section>
      ) : null}
    </>
  );
}
