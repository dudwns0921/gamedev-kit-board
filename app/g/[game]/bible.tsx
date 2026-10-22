"use client";

import { Fragment, useState, type ReactNode } from "react";
import type { Board } from "@/lib/board";
import type { Zoom } from "./review";

// The game's bible: pages the user keeps coming back to — who is who, how each looks, the places — written by the game's session in its
// docs/bible/ (the kit's `bible`), shown as written. Pictures on consecutive lines stand in one row at one height, feet on one line,
// so people can be compared side by side; any picture opens large.

const IMG = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;

function inline(s: string) {
  return s.split(/(`[^`]+`|\*\*[^*]+\*\*)/).map((p, i) =>
    p.startsWith("`") && p.endsWith("`") && p.length > 1 ? <code key={i}>{p.slice(1, -1)}</code>
      : p.startsWith("**") && p.endsWith("**") && p.length > 3 ? <b key={i}>{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>);
}

function Page({ text, file, zoom }: { text: string; file: (p: string) => string; zoom: Zoom }) {
  const out: ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;
  const take = (ok: (l: string) => boolean) => { const got: string[] = []; while (i < lines.length && ok(lines[i].trim())) got.push(lines[i++].trim()); return got; };
  while (i < lines.length) {
    const l = lines[i].trim();
    const k = out.length;
    if (!l) { i++; continue; }
    const h = l.match(/^(#{2,4}) +(.*)/);
    if (h) { out.push(h[1].length === 2 ? <h2 key={k}>{inline(h[2])}</h2> : <h3 key={k}>{inline(h[2])}</h3>); i++; continue; }
    if (IMG.test(l)) {
      const pics = take((x) => IMG.test(x)).map((x) => x.match(IMG)!);
      out.push(
        <div key={k} className="bb-row">
          {pics.map(([, cap, src], j) => (
            <figure key={j} onClick={() => src && zoom(file(src), cap)}>
              <div className="bb-pic">{src ? <img src={file(src)} alt={cap} loading="lazy" /> : <span className="small muted">not drawn yet</span>}</div>
              {cap ? <figcaption>{inline(cap)}</figcaption> : null}
            </figure>
          ))}
        </div>);
      continue;
    }
    if (/^[-*] /.test(l)) {
      out.push(<ul key={k}>{take((x) => /^[-*] /.test(x)).map((x, j) => <li key={j}>{inline(x.slice(2))}</li>)}</ul>);
      continue;
    }
    if (l.startsWith("|")) {
      const rows = take((x) => x.startsWith("|")).filter((x) => !/^\|[\s:|-]+\|$/.test(x))
        .map((x) => x.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
      out.push(
        <div key={k} className="tablewrap"><table className="tbl bb-tbl">
          <thead><tr>{rows[0].map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead>
          <tbody>{rows.slice(1).map((r, j) => <tr key={j}>{r.map((c, n) => <td key={n}>{inline(c)}</td>)}</tr>)}</tbody>
        </table></div>);
      continue;
    }
    out.push(<p key={k}>{inline(take((x) => !!x && !/^(#{2,4} |[-*] |\||!\[)/.test(x)).join(" "))}</p>);
  }
  return <div className="bb-page">{out}</div>;
}

export function Bible({ b, file, zoom }: { b: Board; file: (p: string) => string; zoom: Zoom }) {
  const pages = b.bible ?? [];
  const [sel, setSel] = useState<string | null>(null);
  if (!pages.length)
    return <div className="empty">No bible yet — pages the game keeps (who is who, how each looks) go in the game&apos;s <code>docs/bible/</code>. Ask the game&apos;s session to write one.</div>;
  const page = pages.find((p) => p.name === sel) ?? pages[0];
  return (
    <>
      {pages.length > 1 ? (
        <div className="ep-cycles" role="group" aria-label="Pages">
          {pages.map((p) => (
            <button key={p.name} className={p === page ? "on" : ""} aria-pressed={p === page} onClick={() => setSel(p.name)}><b>{p.title}</b></button>
          ))}
        </div>
      ) : null}
      <section className="card sec">
        <h1>{page.title}</h1>
        <Page text={page.text} file={file} zoom={zoom} />
      </section>
    </>
  );
}
