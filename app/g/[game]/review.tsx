"use client";

import { useEffect, useState } from "react";
import type { Picture, Review } from "@/lib/board";

export type Zoom = (src: string, label: string) => void;

// What waits on the user. Answers reach the game's session one of two ways, and the page says which at the top:
// with a claude.ai link (board.share) the taps happen there and "Send to Claude" wakes the session — the cards here are a preview;
// without one, the taps happen here and "Copy answers" gives the lines to paste in the game's chat.
// Answers kept in this browser are dropped once their question leaves the board (answered, or asked anew — the key changes then).

type A = Record<string, { pick: string; note: string }>;

const GROUPS: { kind: Review["kind"]; title: string }[] = [
  { kind: "decision", title: "Decisions" },
  { kind: "asset", title: "Assets to approve" },
  { kind: "style", title: "Drawn in an old art style" },
  { kind: "check", title: "Check by playing" },
];

function label(i: Review): string {
  return i.kind === "decision" ? i.ref : i.kind === "asset" ? `asset ${i.ref}` : i.kind === "style" ? `old-style asset ${i.ref}` : `check “${i.ref.slice(0, 40)}”`;
}

function choices(i: Review): { pick: string; text: string; mark?: string; tag?: string; no?: boolean }[] {
  if (i.kind === "decision") {
    const chose = [...i.proxy].find((ch) => i.options.some((o) => o.mark === ch)) ?? "";
    const opts = i.options.map((o) => ({ pick: o.mark, mark: o.mark, text: o.text,
      tag: chose && o.mark === chose ? "for you" : o.mark && o.mark === i.recommend ? "recommended" : undefined }));
    return i.proxy ? [{ pick: "accept", mark: "✓", text: `Accept ${chose || i.proxy}` }, ...opts] : opts;
  }
  if (i.kind === "asset") return [{ pick: "approve", text: "Approve" }, { pick: "redo", text: "Redo", no: true }];
  if (i.kind === "style") return [{ pick: "keep", text: "Keep this look" }, { pick: "redraw", text: "Redraw in today's style", no: true }];
  return [{ pick: "ok", text: "OK" }, { pick: "problem", text: "Problem", no: true }];
}

export default function ReviewTab({ game, share, items, file, zoom }: { game: string; share: string | null; items: Review[]; file: (p: string) => string; zoom: Zoom }) {
  const store = `board-review:${game}`;
  const [a, setA] = useState<A>({});
  const [said, setSaid] = useState("");
  const here = share === null;

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

  const answered = items.filter((i) => a[i.key]?.pick).length;
  const text = items.map((i) => { const v = a[i.key]; return v && (v.pick || v.note) ? `${label(i)} → ${v.pick}${v.note ? " — " + v.note : ""}` : ""; }).filter(Boolean).join("\n");

  async function copy() {
    if (!text) { setSaid("Pick an answer first."); return; }
    try {
      await navigator.clipboard.writeText("Answers from the board — act on each:\n" + text);
      setSaid("Copied — paste it in the game's Claude chat. The board updates by itself once the session acts.");
    } catch { setSaid(text); }
  }

  if (!items.length) return <div className="empty">Nothing waits on you. New questions, images to approve and checks show up here as the game&apos;s session raises them.</div>;

  return (
    <>
      <div className="card how">
        {here ? (
          <ol>
            <li><b>Tap an answer</b> on each card — a note is optional.</li>
            <li><b>Copy answers</b> (bottom bar) and paste them in the game&apos;s Claude chat.</li>
            <li>The session acts on them; this board updates by itself.</li>
          </ol>
        ) : (
          <ol>
            <li>Look the cards over here.</li>
            <li><b>Answer on Claude</b> — the same cards; each tap is saved for the game&apos;s session.</li>
            <li>Press <b>Send to Claude</b> there. The session wakes and acts; this board updates by itself.</li>
          </ol>
        )}
        {here ? null : <a className="btn primary go" href={share!} target="_blank" rel="noreferrer">Answer on Claude ↗</a>}
      </div>

      {GROUPS.map((g) => {
        const its = items.filter((i) => i.kind === g.kind);
        if (!its.length) return null;
        const cyc = its.find((i) => "cycle" in i && i.cycle) as { cycle?: string } | undefined;
        return (
          <section key={g.kind} className="sec">
            <div className="sec-h"><h2>{g.title}</h2><span className="lab">{its.length}{cyc?.cycle ? ` · cycle ${cyc.cycle}` : ""}</span></div>
            {g.kind === "style" ? <div className="small muted">The art style changed after these were drawn. Keep marks one as today&apos;s style; redraw makes new images to approve (a model or sprite sheet is remade after that).</div> : null}
            <div className="grid">
              {its.map((i) => {
                const v = a[i.key];
                const opts = choices(i);
                return (
                  <div key={i.key} className={`card q${v?.pick ? " done" : ""}`}>
                    {i.kind === "decision" && (i.who || i.proxy) ? <span className="lab">{[i.who, i.proxy ? "decided for you" : ""].filter(Boolean).join(" · ")}</span> : null}
                    {i.kind === "asset" || i.kind === "style" ? <span className="lab">{i.tool === "asset" ? "3D model" : "sprite"} · {i.state}</span> : null}
                    <h3>{i.kind === "decision" ? <code>{i.ref}</code> : null}{i.title}</h3>
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
                        <button key={o.pick} className={`opt${o.no ? " no" : ""}${v?.pick === o.pick ? " on" : ""}`} disabled={!here}
                          onClick={() => set(i.key, { pick: o.pick })}>
                          {o.mark ? <b>{o.mark}</b> : null}<span>{o.text}</span>{o.tag ? <em>{o.tag}</em> : null}
                        </button>
                      ))}
                    </div>
                    {here ? <textarea className="note" rows={1} placeholder={i.kind === "decision" ? "Note (optional)" : i.kind === "check" ? "What did you see?" : "What is off?"}
                      value={v?.note ?? ""} onChange={(e) => set(i.key, { note: e.target.value })} /> : null}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {here ? (
        <div className="dock">
          <span className="lab">Answered</span><b>{answered} / {items.length}</b>
          <div className="act">
            <button className="btn primary" onClick={copy} disabled={!text}>Copy answers</button>
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
