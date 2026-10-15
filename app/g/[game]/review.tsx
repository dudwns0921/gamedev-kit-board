"use client";

import { useCallback, useEffect, useState } from "react";
import type { Picture, Review } from "@/lib/board";
import NotNeeded, { type Run } from "./not-needed";

export type Zoom = (src: string, label: string) => void;

// Everything that waits on the user, on one page. How an answer reaches the game's session, the page says at the top:
// - a game whose board came from this machine: "Send to the session" puts the answers in the game's inbox; the session is woken for them,
//   acts, and the board follows — each card shows sent → taken by the session, and leaves once the board no longer asks it;
// - a game on a claude.ai link only: the cards are a preview — answer there and press "Send to Claude";
// - otherwise: "Copy answers" gives the lines to paste in the game's chat.
// Picks are kept in this browser until sent; a question asked anew has a new key, so an old pick never answers it.

type A = Record<string, { pick: string; note: string }>;
type Box = { sent: string[]; taken: string[] };

const GROUPS: { id: string; title: string; hit: (i: Review) => boolean; hint?: string }[] = [
  { id: "now", title: "Decisions — this cycle", hit: (i) => i.kind === "decision" && i.latest !== false },
  { id: "earlier", title: "Decisions left in earlier cycles", hit: (i) => i.kind === "decision" && i.latest === false,
    hint: "Still open from cycles that have moved on. Answer, or mark not needed." },
  { id: "gdd", title: "Open questions in the GDD", hit: (i) => i.kind === "question", hint: "Write the answer in the note — the session puts it in the GDD." },
  { id: "asset", title: "Assets to approve", hit: (i) => i.kind === "asset" },
  { id: "check", title: "Check by playing", hit: (i) => i.kind === "check" },
];

function label(i: Review): string {
  return i.kind === "decision" ? i.ref : i.kind === "asset" ? `asset ${i.ref}` : i.kind === "question" ? `GDD “${i.ref.slice(0, 40)}”`
    : i.kind === "style" ? `old-style asset ${i.ref}` : `check “${i.ref.slice(0, 40)}”`;
}

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

export default function ReviewTab({ game, share, items, file, zoom, run }: {
  game: string; share: string | null; items: Review[]; file: (p: string) => string; zoom: Zoom; run: Run | null;
}) {
  const store = `board-review:${game}`;
  const [a, setA] = useState<A>({});
  const [box, setBox] = useState<Box>({ sent: [], taken: [] });
  const [said, setSaid] = useState("");
  const [busy, setBusy] = useState(false);
  const mode: "direct" | "link" | "copy" = run ? "direct" : share ? "link" : "copy";
  const pickable = mode !== "link";

  useEffect(() => {
    try {
      const kept = JSON.parse(localStorage.getItem(store) || "{}") as A;
      const live = new Set(items.map((i) => i.key));
      setA(Object.fromEntries(Object.entries(kept).filter(([k]) => live.has(k))));
    } catch { /* storage off — answers live only in this page */ }
  }, [store, items]);

  // where sent answers stand — checked often while any are on their way
  const look = useCallback(async () => {
    if (mode !== "direct") return;
    const r = await fetch(`/g/${game}/inbox`, { cache: "no-store" }).catch(() => null);
    if (r?.ok) setBox((await r.json()) as Box);
  }, [game, mode]);
  useEffect(() => {
    look();
    const id = setInterval(() => { if (!document.hidden) look(); }, 3000);
    return () => clearInterval(id);
  }, [look]);

  function set(k: string, v: Partial<A[string]>) {
    setA((old) => {
      const next = { ...old, [k]: { ...{ pick: "", note: "" }, ...old[k], ...v } };
      try { localStorage.setItem(store, JSON.stringify(next)); } catch { /* kept in the page only */ }
      return next;
    });
  }

  const inFlight = new Set([...box.sent, ...box.taken]);
  const ready = items.filter((i) => !inFlight.has(i.key) && (a[i.key]?.pick || a[i.key]?.note));
  const text = ready.map((i) => { const v = a[i.key]; return `${label(i)} → ${v.pick}${v.note ? " — " + v.note : ""}`; }).join("\n");

  async function deliver() {
    if (!ready.length) { setSaid("Pick an answer first."); return; }
    if (mode === "copy") {
      try {
        await navigator.clipboard.writeText("Answers from the board — act on each:\n" + text);
        setSaid("Copied — paste it in the game's Claude chat.");
      } catch { setSaid(text); }
      return;
    }
    setBusy(true);
    const got = await run!({ action: "send", rows: ready.map((i) => ({ key: i.key, pick: a[i.key].pick, note: a[i.key].note })) });
    setBusy(false);
    setSaid(got.ok ? `${got.said} It is woken for them; this page follows as it works.` : got.said);
    if (got.ok) {
      setA((old) => { const next = { ...old }; ready.forEach((i) => delete next[i.key]); try { localStorage.setItem(store, JSON.stringify(next)); } catch { /* */ } return next; });
      look();
    }
  }

  if (!items.length) return <div className="empty">Nothing waits on you. New decisions, questions, images to approve and checks show up here as the game&apos;s session raises them.</div>;

  return (
    <>
      <div className="card how">
        {mode === "direct" ? (
          <ol>
            <li><b>Pick an answer</b> on each card you want to settle — a note is optional.</li>
            <li><b>Send to the session</b> (bottom bar). The game&apos;s open session is woken for them — or the next one you open.</li>
            <li>It records and works on them; each card shows where it stands, and leaves once done.</li>
          </ol>
        ) : mode === "link" ? (
          <ol>
            <li>Look the cards over here.</li>
            <li><b>Answer on Claude</b> — the same cards; each tap is saved for the game&apos;s session.</li>
            <li>Press <b>Send to Claude</b> there. The session wakes and acts; this board updates by itself.</li>
          </ol>
        ) : (
          <ol>
            <li><b>Tap an answer</b> on each card — a note is optional.</li>
            <li><b>Copy answers</b> (bottom bar) and paste them in the game&apos;s Claude chat.</li>
            <li>The session acts on them; this board updates by itself.</li>
          </ol>
        )}
        {mode === "link" ? <a className="btn primary go" href={share!} target="_blank" rel="noreferrer">Answer on Claude ↗</a> : null}
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
                const where = box.taken.includes(i.key) ? "taken" : box.sent.includes(i.key) ? "sent" : "";
                const opts = choices(i);
                return (
                  <div key={i.key} className={`card q${v?.pick ? " done" : ""}${where ? " flight" : ""}`}>
                    {where ? <span className={`state ${where}`}>{where === "sent" ? "Sent — waiting for the session" : "The session has it — working"}</span> : null}
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
                    {i.kind === "decision" && i.doc && !where ? <NotNeeded run={run} what={i.ref} act={{ action: "drop-decision", doc: i.doc, num: i.ref }} /> : null}
                    {i.kind === "asset" && i.state === "image only" && !where ? <NotNeeded run={run} what={i.ref} act={{ action: "drop-asset", tool: i.tool, name: i.ref }} /> : null}
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
          {inFlight.size ? <span className="small muted">· {box.sent.length} waiting · {box.taken.length} with the session</span> : null}
          <div className="act">
            <button className="btn primary" onClick={deliver} disabled={!ready.length || busy}>
              {mode === "direct" ? (busy ? "Sending…" : `Send to the session${ready.length ? ` (${ready.length})` : ""}`) : "Copy answers"}
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
  return <figure><figcaption>{p.label}</figcaption><button className="im" style={{ backgroundImage: `url(${src})` }} onClick={() => zoom(src, p.label)} aria-label={p.label} /></figure>;
}
