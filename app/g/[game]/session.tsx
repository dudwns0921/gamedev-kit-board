"use client";

import { useEffect, useRef, useState } from "react";
import type { Inbox } from "@/lib/board";

// Whether answers sent now reach the game's Claude session — read from the kit's watcher files, never asked of the session.
// Always shown as one pill in the top bar; a toast only when it changes in a way worth saying (never for "connected ↔ at work",
// which flips every turn, and "disconnected" only once it has lasted a while — the gap between turns is not a disconnection).

export type SessionState = "on" | "work" | "off";

export function stateOf(box: Inbox): SessionState | null {
  if (box.listening == null) return null; // a board from another machine: nothing here to say
  return box.listening ? "on" : box.working ? "work" : "off";
}

const LABEL: Record<SessionState, string> = { on: "Session connected", work: "Session at work", off: "No session" };
const OFF_AFTER = 15_000;

function since(at?: string): string {
  if (!at) return "";
  const t = Date.parse(at.replace(" ", "T"));
  return Number.isFinite(t) ? new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
}

export function SessionPill({ box }: { box: Inbox }) {
  const [open, setOpen] = useState(false);
  const st = stateOf(box);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("mousedown", away);
    addEventListener("keydown", esc);
    return () => { removeEventListener("mousedown", away); removeEventListener("keydown", esc); };
  }, [open]);
  if (!st) return null;
  return (
    <div className="session" ref={ref}>
      <button className={`spill ${st}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog">
        <i /><span className="hide-xs">{LABEL[st]}</span>
      </button>
      {open ? (
        <div className="spop" role="dialog" aria-label={LABEL[st]}>
          <b>{LABEL[st]}</b>
          {st === "on" ? <p>Answers you send wake it now.</p> : null}
          {st === "work" ? <p>A turn is running. Answers you send are taken when it ends.</p> : null}
          {st === "off" ? (
            <>
              {box.ended ? <p className="muted">{since(box.endedAt) ? `Since ${since(box.endedAt)} · ` : ""}{box.ended}</p> : null}
              <p>Answers you send wait in the game. Send <b>any message</b> in the game&apos;s Claude session (or open one): it picks them up and listens again.</p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type Toast = { id: number; tone: "on" | "off" | "took"; title: string; line: string };

/** Toasts for the moments worth saying: a session gone for a while, one back, answers taken. */
export function SessionToasts({ box }: { box: Inbox }) {
  const [items, setItems] = useState<Toast[]>([]);
  const prev = useRef<{ st: SessionState | null; taken: number } | null>(null);
  const toldOff = useRef(false);
  const offTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const n = useRef(0);

  const push = (t: Omit<Toast, "id">, ms: number) => {
    const id = ++n.current;
    setItems((xs) => [...xs.slice(-2), { ...t, id }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), ms);
  };

  useEffect(() => {
    const st = stateOf(box);
    const taken = box.taken.length;
    const was = prev.current;
    prev.current = { st, taken };
    if (!was || was.st == null || st == null) {  // the first state the page is told is where things stand, not a change —
      if (st === "off") toldOff.current = true;    // though one that opens on "no session" is told when one comes
      return;
    }
    if (st === "off" && was.st !== "off") {
      if (offTimer.current) clearTimeout(offTimer.current);
      offTimer.current = setTimeout(() => {
        toldOff.current = true;
        push({ tone: "off", title: "Session disconnected", line: "Your answers wait — send any message in the game's session to reconnect it." }, 7000);
      }, OFF_AFTER);
    }
    if (st !== "off" && was.st === "off") {
      if (offTimer.current) clearTimeout(offTimer.current);
      offTimer.current = null;
      if (toldOff.current) {
        toldOff.current = false;
        push({ tone: "on", title: "Session reconnected", line: taken > was.taken ? `It took ${taken} waiting answer${taken === 1 ? "" : "s"}.` : "Answers you send wake it again." }, 4500);
        return;
      }
    }
    if (taken > was.taken) push({ tone: "took", title: "The session took your answers", line: "Each card leaves as it is done." }, 4500);
  }, [box]);

  useEffect(() => () => { if (offTimer.current) clearTimeout(offTimer.current); }, []);

  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          <i /><div><b>{t.title}</b><span>{t.line}</span></div>
          <button aria-label="Dismiss" onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}>×</button>
        </div>
      ))}
    </div>
  );
}
