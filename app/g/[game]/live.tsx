"use client";

import { useEffect, useRef, useState } from "react";
import { ago } from "@/lib/board";

// The kit's board in a frame, under a thin bar. It checks for a newer board every 20 s and swaps it in;
// the page inside keeps its own place (which tab) only until then — a new board is a new drawing.
const EVERY = 20_000;

export default function Live({ game, name, received, share, back = "/" }: { game: string; name: string; received: string; share: string | null; back?: string }) {
  const [at, setAt] = useState(received);
  const [fresh, setFresh] = useState(false);
  const [, tick] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      tick((n) => n + 1);
      if (document.hidden) return;
      const r = await fetch(`/g/${game}/summary`, { cache: "no-store" }).catch(() => null);
      if (!r || !r.ok) return;
      const s = (await r.json()) as { received: string };
      if (s.received !== at) {
        setAt(s.received);
        setFresh(true);
        frame.current?.contentWindow?.location.reload();
        setTimeout(() => setFresh(false), 4000);
      }
    }, EVERY);
    return () => clearInterval(id);
  }, [game, at]);

  return (
    <div className="frame">
      <header className="topbar">
        <div className="in">
          <a className="btn ghost" href={back}>←</a>
          <div className="title"><span className="lab">Kit page</span><b>{name}</b></div>
          <div className="right">
            <span className={fresh ? "live new" : "live"}><i />{fresh ? "Updated just now" : `Updated ${ago(at)}`}</span>
            {share ? <a className="btn primary" href={share} target="_blank" rel="noreferrer">Answer on Claude ↗</a> : null}
          </div>
        </div>
      </header>
      <iframe ref={frame} src={`/g/${game}/view`} title={`${name} board`} />
    </div>
  );
}
