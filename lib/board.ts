// What the client draws from — types and small helpers only, so a page in the browser never pulls in the storage code.

// The shape of the kit's board.json (board.py writes it beside the board). Fields the kit adds later simply pass through.
// Paths in it (img, audio, src, views) are the kit's content-named files, f/<hash>.<ext> — served here at /g/<game>/f/….

export type St = "done" | "temp" | "none" | "bad";

// src: where its state is read from — gdd · slot · file · cycle · playtest · note (absent on a board from an older kit)
export type Item = { st: St; title: string; sub: string; note: string; img: string; audio: string; tags: string[]; code: string; src?: string };

export type Stage = {
  i: number;
  name: string;
  about: string;
  common: boolean;
  loop: boolean;
  complete: number | null;
  image: string;
  lanes: Record<string, Item[]>;
  open: Ask[];
  work: { cycle: string; name: string; stage: string; tasks: { num: string; title: string; mark: string; did: string }[] }[];
};

/** An open question. One from a cycle names its decision — the dashboard can send "not needed" for it (key: the review card's key). */
export type Ask = { title: string; text: string; from: string; decision?: { doc: string; num: string; key?: string } };

/** The one thing the dashboard does to a game: send answers to its session (lib/act.ts). The session does the work. */
export type Answer = { key: string; pick: string; note: string };

/** Where the answers sent to a game stand, by review key: waiting to be taken, taken by the session, relayed to it and being worked on.
 *  untaken: answers wait and no session will take them until the user sends a message in one.
 *  listening · working · ended: where the session stands, as the kit wrote it in .session (null: a board from another machine). */
export type Inbox = { sent: string[]; taken: string[]; relayed: string[]; untaken: boolean; listening?: boolean | null; working?: boolean; ended?: string; endedAt?: string };

export type Act = { action: "send"; rows: Answer[] };

export type Picture = { label: string; src: string; crop?: number[]; size?: number[] };

export type Review = (
  | { kind: "decision"; key: string; ref: string; title: string; cycle: string; doc?: string; latest?: boolean; who: string; recommend: string; proxy: string;
      options: { mark: string; text: string }[]; pictures: Picture[];
      why?: string; detail?: string; reason?: string }  // what led to it · the numbers and names behind it (folded) · why the recommendation
  | { kind: "todo"; key: string; ref: string; title: string; cycle: string; doc?: string; latest?: boolean; pictures: Picture[];
      why?: string; detail?: string; wait?: string }  // something only the user can do outside the chat · its steps · what to copy · the file that closes it
  | { kind: "question"; key: string; ref: string; title: string; text: string }
  | { kind: "check"; key: string; ref: string; title: string; cycle: string }
) & { later?: string };  // put off to a later cycle by the session — waiting, not in hand

export type Model = { name: string; img: string; tool: string; st: St; state: string; old: boolean; sample: boolean; reference: boolean; what: string; rejected: number };

export type Board = {
  lanes: { key: string; label: string }[];
  stages: Stage[];
  asks: (Ask & { stage: number })[];
  cycles: { num: string; name: string; stage: string; start: string; goal: string;
    tasks: { done: number; open: number; blocked: number }; decisions: { open: number; all: number } }[];
  review: Review[];
  assets: { style: string; world: string; learned: string[]; sound: string; models: Model[]; loose: Model[]; sounds: Item[] };
};

export type Summary = {
  game: string;
  name: string;
  drawn: string;
  received: string;
  complete: number;
  /** pause: the cycle waits on the user (decisions asked, or time to play) and the game's conversation has grown long — a good moment to /clear it.
   *  context: that conversation's size in tokens, as the kit's context hook kept it. */
  now: { cycle: string; name: string; stage: string; pause?: boolean; context?: number } | null;
  counts: { problems: number; not_made: number; placeholders: number; undecided: number; review: number; done?: number; old_style?: number };
  stages: { name: string; complete: number | null }[];
  /** Sent only to a dashboard on the same machine: where the game's board folder is, so answers can be put in its inbox. */
  local?: { root?: string; board?: string };
  /** Everything the pages show. */
  board?: Board;
};

export function ago(iso: string): string {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}

/** When, as a time of day — today's without the date. Said once, so it never needs a clock to stay true. */
export function at(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString() ? `at ${time}` : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}
