"use client";

import { useEffect, useRef, useState } from "react";
import { THEME_COOKIE, THEMES, type Theme } from "@/lib/theme";

// One button in the top bar; it opens the four looks, each drawn as a small preview so the choice is made by eye.
// The pick applies at once and is kept for a year in a cookie the server reads.

function current(): Theme {
  return (document.documentElement.dataset.theme as Theme) || "system";
}

export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setTheme(current()), []);
  useEffect(() => {
    if (!open) return;
    const off = (ev: MouseEvent | KeyboardEvent) => {
      if (ev instanceof KeyboardEvent ? ev.key === "Escape" : !box.current?.contains(ev.target as Node)) setOpen(false);
    };
    addEventListener("mousedown", off);
    addEventListener("keydown", off);
    return () => {
      removeEventListener("mousedown", off);
      removeEventListener("keydown", off);
    };
  }, [open]);

  function pick(t: Theme) {
    document.documentElement.dataset.theme = t;
    document.cookie = `${THEME_COOKIE}=${t}; path=/; max-age=31536000; samesite=lax`;
    setTheme(t);
    setOpen(false);
  }

  return (
    <div className="theme" ref={box}>
      <button className="btn icon" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} title="Theme">
        <span className={`sw sw-${theme}`} aria-hidden />
        <span className="hide-sm">{THEMES.find((t) => t.id === theme)?.label}</span>
      </button>
      {open ? (
        <div className="menu" role="menu">
          <span className="lab">Theme</span>
          {THEMES.map((t) => (
            <button key={t.id} role="menuitemradio" aria-checked={t.id === theme} className={t.id === theme ? "on" : ""} onClick={() => pick(t.id)}>
              <span className={`sw big sw-${t.id}`} aria-hidden />
              <span className="txt"><b>{t.label}</b><small>{t.hint}</small></span>
              {t.id === theme ? <span className="check">✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
