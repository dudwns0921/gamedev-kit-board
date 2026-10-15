"use client";

import { useEffect, useRef, useState } from "react";

// The kit's board in a frame, under a thin bar. It checks for a newer board every 20 s and swaps it in;
// the page inside keeps its own place (which tab) only until then — a new board is a new drawing.
const EVERY = 20_000;

function ago(iso: string): string {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}

export default function Live({ game, name, received, share }: { game: string; name: string; received: string; share: string | null }) {
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
      <div className="bar">
        <a className="btn" href="/">← Games</a>
        <strong>{name}</strong>
        {share ? <a className="btn rv" href={share} target="_blank" rel="noreferrer">Answer on Claude ↗</a> : null}
        <span className={fresh ? "fresh new" : "fresh"}>{fresh ? "Updated just now" : `Updated ${ago(at)}`}</span>
      </div>
      <iframe ref={frame} src={`/g/${game}/view`} title={`${name} board`} />
    </div>
  );
}
