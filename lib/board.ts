// What the client draws from — types and small helpers only, so a page in the browser never pulls in the storage code.

// The shape of the kit's board.json (board.py writes it beside the board). Fields the kit adds later simply pass through.
// Paths in it (img, audio, src, views) are the kit's content-named files, f/<hash>.<ext> — served here at /g/<game>/f/….

export type St = "done" | "temp" | "none" | "bad";

// src: where its state is read from — gdd · slot · file · cycle · playtest · note (absent on a board from an older kit)
export type Item = { st: St; title: string; sub: string; note: string; img: string; audio: string; tags: string[]; code: string; src?: string;
  /** part: what the player meets that it belongs to (board.flow's parts, or one made from its name) ·
   *  for an asset — what: what it is (the cycle's description) · cycle: the cycle that first listed it · file · used_in: the code files that name it */
  part?: string; what?: string; cycle?: string; file?: string; used_in?: string[] };

/** One thing the player meets in a stage — an enemy, a weapon, the room — with how far it is. named: set in board.flow (else made from names). */
export type Part = { name: string; about: string; named: boolean; complete: number | null };

export type Stage = {
  i: number;
  name: string;
  about: string;
  common: boolean;
  loop: boolean;
  complete: number | null;
  image: string;
  /** image is the screen a cycle shot of this stage (the kit's `cycle.py shot`): which cycle, and how many cycles behind the newest one. null: no screen shot yet */
  shot?: { cycle: string; behind: number } | null;
  lanes: Record<string, Item[]>;
  parts?: Part[];
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
  | { kind: "check"; key: string; ref: string; title: string; cycle: string; detail?: string }  // detail: a tuning hint an older document wrote after the question
) & { later?: string };  // put off to a later cycle by the session — waiting, not in hand

/** Where an asset is used: the stage of play it was placed in, and the code files that name it (an engine that points at files by id finds none). */
export type Used = { stage: string; code: string[] };

export type Model = { name: string; img: string; tool: string; st: St; state: string; old: boolean; sample: boolean; reference: boolean; what: string; rejected: number; used?: Used };

/** A task of a cycle. mark: x done · ' ' open · '>' being worked on now · '!' blocked · '-' dropped. did · blocked: the lines written under it. */
export type Task = { num: string; title: string; mark: string; did?: string; blocked?: string; wave?: number; stages?: number[]; assets?: string[] };

/** An asset a cycle listed: what it is, how far it is, the stage it is in, and the tasks that name it. */
export type CycleAsset = { name: string; kind: string; what: string; st: St; stage: number | null; img: string; audio: string; tasks: string[] };

export type Board = {
  lanes: { key: string; label: string }[];
  stages: Stage[];
  asks: (Ask & { stage: number })[];
  /** The stages of a cycle, in order (Goal … Play) — a cycle's stage is one of them, or Closed. */
  steps?: string[];
  /** line: the goal in one line (`cycle.py line`) · shot: the first screen the cycle shot · skipped: the stages it chose not to run ·
   *  list: its tasks · stages: the stages of play it worked in · shots: the screens it shot, by stage. */
  cycles: { num: string; name: string; stage: string; start: string; goal: string; line?: string; shot?: string; skipped?: string[];
    list?: Task[]; stages?: number[]; shots?: { stage: string; img: string }[]; assets?: CycleAsset[];
    tasks: { done: number; open: number; blocked: number; doing?: number }; decisions: { open: number; all: number } }[];
  review: Review[];
  assets: { style: string; world: string; learned: string[]; sound: string; models: Model[]; loose: Model[]; sounds: (Item & { used?: Used })[] };
};

export type Summary = {
  game: string;
  name: string;
  drawn: string;
  received: string;
  complete: number;
  /** pause: the cycle waits on the user (decisions asked, or time to play) and the game's conversation has grown long — a good moment to /clear it.
   *  context: that conversation's size in tokens, as the kit's context hook kept it. */
  now: { cycle: string; name: string; stage: string; line?: string; pause?: boolean; context?: number } | null;
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
