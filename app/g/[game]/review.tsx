"use client";

import { useEffect, useState } from "react";
import type { Inbox, Picture, Review } from "@/lib/board";
import NotNeeded, { type Run } from "./not-needed";

export type Zoom = (src: string, label: string) => void;

// Everything that waits on the user, on one page. "Send to the session" puts the answers in the game's inbox; the session is woken for them,
// acts, and the board follows — each card shows sent → taken by the session as the inbox changes (told by the dashboard's one connection),
// and leaves once the board no longer asks it.
// Picks are kept in this browser until sent; a question asked anew has a new key, so an old pick never answers it.

type A = Record<string, { pick: string; note: string }>;

const GROUPS: { id: string; title: string; hit: (i: Review) => boolean; hint?: string }[] = [
  { id: "now", title: "Decisions — this cycle", hit: (i) => i.kind === "decision" && i.latest !== false },
  { id: "earlier", title: "Decisions left in earlier cycles", hit: (i) => i.kind === "decision" && i.latest === false,
    hint: "Still open from cycles that have moved on. Answer, or mark not needed." },
  { id: "gdd", title: "Open questions in the GDD", hit: (i) => i.kind === "question", hint: "Write the answer in the note — the session puts it in the GDD." },
  { id: "asset", title: "Assets to approve", hit: (i) => i.kind === "asset" },
  { id: "check", title: "Check by playing", hit: (i) => i.kind === "check" },
];

function choices(i: Review): { pick: string; text: string; mark?: string; tag?: string; no?: boolean }[] {
  if (i.kind === "decision") {
    const chose = [...i.proxy].find((ch) => i.options.some((o) => o.mark === ch)) ?? "";
    const opts = i.options.map((o) => ({ pick: o.mark, mark: o.mark, text: o.text,
      tag: chose && o.mark === chose ? "for you" : o.mark && o.mark === i.recommend ? "recommended" : undefined }));
    return i.proxy ? [{ pick: "accept", mark: "✓", text: `Accept ${chose || i.proxy}` }, ...opts] : opts;
  }
  if (i.kind === "asset") return [{ pick: "approve", text: "Approve" }, { pick: "redo", text: "Redo", no: true }];
  if (i.kind === "question") return [{ pick: "answer", text: "Answer (in the note)" }, { pick: "drop", text: "Not needed", no: true }];
  if (i.kind === "style") return [{ pick: "keep", text: "Keep this look" }, { pick: "redraw", text: "Redraw", no: true }];
  return [{ pick: "ok", text: "OK" }, { pick: "problem", text: "Problem", no: true }];
}

export default function ReviewTab({ game, box, items, file, zoom, run }: {
  game: string; box: Inbox; items: Review[]; file: (p: string) => string; zoom: Zoom; run: Run | null;
}) {
  const store = `board-review:${game}`;
  const [a, setA] = useState<A>({});
  const [said, setSaid] = useState("");
  const [busy, setBusy] = useState(false);
  const pickable = Boolean(run); // a board sent from another machine has no inbox here to send to

  useEffect(() => {
    try {
      const kept = JSON.parse(localStorage.getItem(store) || "{}") as A;
      const live = new Set(items.map((i) => i.key));
      setA(Object.fromEntries(Object.entries(kept).filter(([k]) => live.has(k))));
    } catch { /* storage off — answers live only in this page */ }
  }, [store, items]);

  function set(k: string, v: Partial<A[string]>) {
    setA((old) => {
      const next = { ...old, [k]: { ...{ pick: "", note: "" }, ...old[k], ...v } };
      try { localStorage.setItem(store, JSON.stringify(next)); } catch { /* kept in the page only */ }
      return next;
    });
  }

  const working = [...box.taken, ...box.relayed];
  const inFlight = new Set([...box.sent, ...working]);
  const ready = items.filter((i) => !inFlight.has(i.key) && (a[i.key]?.pick || a[i.key]?.note));

  async function deliver() {
    if (!ready.length) { setSaid("Pick an answer first."); return; }
    setBusy(true);
    const got = await run!({ action: "send", rows: ready.map((i) => ({ key: i.key, pick: a[i.key].pick, note: a[i.key].note })) });
    setBusy(false);
    setSaid(got.ok ? `${got.said} It is woken for them; this page follows as it works.` : got.said);
    if (got.ok) {
      setA((old) => { const next = { ...old }; ready.forEach((i) => delete next[i.key]); try { localStorage.setItem(store, JSON.stringify(next)); } catch { /* */ } return next; });
    }
  }

  // whether answers sent now wake a session — told by the kit's watcher files, nothing asked of the session
  const idle = !run || box.listening == null ? null : box.listening
    ? <div className="listen small"><i />The game&apos;s session is listening — answers you send wake it.</div>
    : <div className="card idle"><b>No session is listening right now</b>{box.ended ? <span className="muted"> — {box.ended}</span> : null}.
        {" "}Send any message in the game&apos;s Claude session (or open one): it picks up what waits and listens again.{box.untaken ? " Your answers wait for it." : ""}</div>;
  if (!items.length) return <>{idle}<div className="empty">Nothing waits on you. New decisions, questions, images to approve and checks show up here as the game&apos;s session raises them.</div></>;

  return (
    <>
      {idle}
      <div className="card how">
        {run ? (
          <ol>
            <li><b>Pick an answer</b> on each card you want to settle — a note is optional.</li>
            <li><b>Send to the session</b> (bottom bar). The game&apos;s open Claude session is woken for them — or the next one you open picks them up.</li>
            <li>The session records and works on them; this page only shows it — each card shows where it stands, and leaves once done.</li>
          </ol>
        ) : <span>This board was sent from another machine — answer in that game&apos;s Claude session.</span>}
      </div>

      {GROUPS.map((g) => {
        const its = items.filter(g.hit);
        if (!its.length) return null;
        return (
          <section key={g.id} className="sec">
            <div className="sec-h"><h2>{g.title}</h2><span className="lab">{its.length}</span></div>
            {g.hint ? <div className="small muted">{g.hint}</div> : null}
            <div className="grid">
              {its.map((i) => {
                const v = a[i.key];
                const where = working.includes(i.key) ? "taken" : box.sent.includes(i.key) ? "sent" : "";
                const opts = choices(i);
                return (
                  <div key={i.key} className={`card q${v?.pick ? " done" : ""}${where ? ` flight ${where}` : ""}`}>
                    {where ? <span className={`state ${where}`}>{where === "sent" ? "Sent — waiting for the session" : "The session is on it"}</span> : null}
                    {i.kind === "decision" ? <span className="lab">{[i.latest === false ? `cycle ${i.cycle}` : "", i.who, i.proxy ? "decided for you" : ""].filter(Boolean).join(" · ")}</span> : null}
                    {i.kind === "asset" || i.kind === "style" ? <span className="lab">{i.tool === "asset" ? "3D model" : "sprite"} · {i.state}</span> : null}
                    <h3>{i.kind === "decision" ? <code>{i.ref}</code> : null}{i.title}</h3>
                    {i.kind === "question" && i.text ? <div className="small muted">{i.text}</div> : null}
                    {(i.kind === "asset" || i.kind === "style") && i.what ? <div className="small muted clamp" title={i.what}>{i.what}</div> : null}
                    {(i.kind === "asset" || i.kind === "style") && i.said.length ? <div className="was clamp">Turned down: {i.said.join(" / ")}</div> : null}
                    {i.kind === "decision" && i.pictures.length ? <div className="figs">{i.pictures.map((p, n) => <Pic key={n} p={p} file={file} zoom={zoom} />)}</div> : null}
                    {(i.kind === "asset" || i.kind === "style") && i.views.length ? (
                      <div className="figs">
                        {i.views.map((src) => <figure key={src}><button className="im" style={{ backgroundImage: `url(${file(src)})` }} onClick={() => zoom(file(src), i.ref)} aria-label={i.ref} /></figure>)}
                      </div>
                    ) : null}
                    <div className={`opts${i.kind === "decision" ? "" : " pair"}`}>
                      {opts.map((o) => (
                        <button key={o.pick} className={`opt${o.no ? " no" : ""}${v?.pick === o.pick ? " on" : ""}`} disabled={!pickable || !!where}
                          onClick={() => set(i.key, { pick: v?.pick === o.pick ? "" : o.pick })}>
                          {o.mark ? <b>{o.mark}</b> : null}<span>{o.text}</span>{o.tag ? <em>{o.tag}</em> : null}
                        </button>
                      ))}
                    </div>
                    {pickable && !where ? <textarea className="note" rows={1}
                      placeholder={i.kind === "question" ? "Your answer" : i.kind === "decision" ? "Note (optional)" : i.kind === "check" ? "What did you see?" : "What is off?"}
                      value={v?.note ?? ""} onChange={(e) => set(i.key, { note: e.target.value })} /> : null}
                    {i.kind === "decision" && i.doc && !where ? <NotNeeded run={run} what={i.ref} item={i.key} /> : null}
                    {i.kind === "asset" && i.state === "image only" && !where ? <NotNeeded run={run} what={i.ref} item={i.key} /> : null}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {pickable ? (
        <div className="dock">
          <span className="lab">Ready to send</span><b>{ready.length}</b>
          {inFlight.size ? <span className="small muted">· {box.sent.length} waiting · {working.length} with the session</span> : null}
          <div className="act">
            <button className="btn primary" onClick={deliver} disabled={!ready.length || busy}>
              {busy ? "Sending…" : `Send to the session${ready.length ? ` (${ready.length})` : ""}`}
            </button>
          </div>
          <span className="said">{said}</span>
        </div>
      ) : null}
    </>
  );
}

function Pic({ p, file, zoom }: { p: Picture; file: (s: string) => string; zoom: Zoom }) {
  if (!p.src) return <figure><figcaption>{p.label}</figcaption><div className="im" /></figure>;
  const src = file(p.src);
  if (p.crop && p.size) {
    const [x, y, w, h] = p.crop;
    const pct = (v: number, of: number) => `${(100 * v) / of}%`;
    return (
      <figure>
        <figcaption>{p.label}</figcaption>
        <div className="crop" style={{ aspectRatio: `${w}/${h}` }} onClick={() => zoom(src, p.label)}>
          <img alt="" src={src} style={{ width: pct(p.size[0], w), left: `-${pct(x, w)}`, top: `-${pct(y, h)}` }} />
        </div>
      </figure>
    );
  }
  return <figure><figcaption>{p.label}</figcaption><button className="im pic" onClick={() => zoom(src, p.label)} aria-label={p.label}><img alt="" src={src} /></button></figure>;
}
