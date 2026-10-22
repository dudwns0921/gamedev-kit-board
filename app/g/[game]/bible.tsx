"use client";

import type { Board } from "@/lib/board";
import type { Zoom } from "./review";

// The game's bible: the pictures the user keeps coming back to — a chart of who is who, each person in full — from the game's docs/bible/
// (the kit's `bible`). Each by its file name; any opens large, sent whole so a face can be looked at up close.

export function Bible({ b, file, zoom }: { b: Board; file: (p: string) => string; zoom: Zoom }) {
  const pics = b.bible ?? [];
  if (!pics.length)
    return <div className="empty">No pictures yet — put the ones you keep coming back to in the game&apos;s <code>docs/bible/</code>.</div>;
  return (
    <div className="bb-row">
      {pics.map((p) => (
        <figure key={p.name} onClick={() => zoom(file(p.src), p.name)}>
          <div className="bb-pic"><img src={file(p.src)} alt={p.name} loading="lazy" /></div>
          <figcaption><code>{p.name}</code></figcaption>
        </figure>
      ))}
    </div>
  );
}
