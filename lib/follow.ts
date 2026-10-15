import { watch, type FSWatcher } from "node:fs";
import path from "node:path";
import type { Inbox, Summary } from "./board";
import { summary } from "./games";
import { status } from "./inbox";
import { LOCAL } from "./storage";

// What an open page is told, the moment it happens: a newer board arrived (the kit's push), or the game's inbox changed (answers sent,
// taken, relayed, done). Nothing here runs on a clock — the files are watched. The one timer is armed by an event: a batch nobody has taken
// is looked at again once it would count as waiting with no session, since that is a change made by time passing, not by a file.

const SETTLE = 150; // a burst of file events (a rename, a redraw) is looked at once

export function follow(game: string, tell: (event: "summary" | "inbox", data: unknown) => void): () => void {
  let board = "";
  let received = "";
  let said = "";
  let again: ReturnType<typeof setTimeout> | null = null;
  let soon: ReturnType<typeof setTimeout> | null = null;
  let inboxWatch: FSWatcher | null = null;
  let boardWatch: FSWatcher | null = null;
  let stateWatch: FSWatcher | null = null; // the kit's watcher files beside the board: .rewake · .rewake.log · .watching
  let closed = false;

  const lookInbox = async (s: Summary) => {
    const { batches: _, ...box } = await status(s);
    if (closed) return;
    const now = JSON.stringify(box);
    if (now !== said) {
      said = now;
      tell("inbox", box as Inbox);
    }
    if (again) clearTimeout(again);
    // time alone turns a batch into "no session took it": 8 s for one not taken, a minute for one taken and never read —
    // and a monitor's beat going quiet (it touches .watching every couple of seconds) into "no session listening"
    const waits = [box.sent.length ? 8_500 : 0, box.taken.length ? 61_000 : 0, box.listening ? 12_000 : 0, box.working ? 60_000 : 0].filter(Boolean);
    const wait = waits.length ? Math.min(...waits) : 0;
    again = wait ? setTimeout(() => current().then((x) => x && lookInbox(x)), wait) : null;
  };

  const current = async () => (closed ? null : await summary(game));

  // the inbox folder may not exist yet — the board folder is watched for it to appear
  const arm = (s: Summary) => {
    const dir = s.local?.board ?? "";
    if (dir === board && (inboxWatch || !dir)) return;
    inboxWatch?.close();
    boardWatch?.close();
    stateWatch?.close();
    inboxWatch = boardWatch = stateWatch = null;
    board = dir;
    if (!dir) return;
    const onInbox = () => {
      if (soon) clearTimeout(soon);
      soon = setTimeout(() => current().then((x) => x && lookInbox(x)), SETTLE);
    };
    try {
      stateWatch = watch(dir, (_e, name) => { if (name && [".rewake", ".rewake.log", ".watching", ".active"].includes(String(name))) onInbox(); });
      stateWatch.on("error", () => { stateWatch?.close(); stateWatch = null; });
    } catch { /* no board folder yet */ }
    try {
      inboxWatch = watch(path.join(dir, "inbox"), onInbox);
      inboxWatch.on("error", () => { inboxWatch?.close(); inboxWatch = null; });
    } catch {
      try {
        boardWatch = watch(dir, (_e, name) => {
          if (name === "inbox") current().then((x) => { if (x) { board = ""; arm(x); onInbox(); } });
        });
        boardWatch.on("error", () => { boardWatch?.close(); boardWatch = null; });
      } catch { /* the game's board folder is gone — the next board it sends says where it is */ }
    }
  };

  const lookSummary = async () => {
    const s = await current();
    if (!s) return;
    if (s.received !== received) {
      received = s.received;
      tell("summary", s);
    }
    arm(s);
    await lookInbox(s);
  };

  let sumSoon: ReturnType<typeof setTimeout> | null = null;
  const games = path.join(LOCAL, "games", game);
  let sumWatch: FSWatcher | null = null;
  try {
    sumWatch = watch(games, (_e, name) => {
      if (name !== "summary.json") return;
      if (sumSoon) clearTimeout(sumSoon);
      sumSoon = setTimeout(lookSummary, SETTLE);
    });
    sumWatch.on("error", () => { sumWatch?.close(); sumWatch = null; });
  } catch { /* no board of this game yet */ }

  // the page is told where things stand as it connects — and again after a reconnect
  current().then((s) => {
    if (!s) return;
    received = s.received;
    tell("summary", s); // the page drops it when it already has this one
    arm(s);
    return lookInbox(s);
  });

  return () => {
    closed = true;
    for (const t of [again, soon, sumSoon]) if (t) clearTimeout(t);
    inboxWatch?.close();
    boardWatch?.close();
    stateWatch?.close();
    sumWatch?.close();
  };
}
