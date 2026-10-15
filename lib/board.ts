// What the client draws from — types and small helpers only, so a page in the browser never pulls in the storage code.

// The shape of the kit's board.json (board.py writes it beside the board). Fields the kit adds later simply pass through.
// Paths in it (img, audio, src, views) are the kit's content-named files, f/<hash>.<ext> — served here at /g/<game>/f/….

export type St = "done" | "temp" | "none" | "bad";

export type Item = { st: St; title: string; sub: string; note: string; img: string; audio: string; tags: string[]; code: string };

export type Stage = {
  i: number;
  name: string;
  about: string;
  common: boolean;
  loop: boolean;
  complete: number | null;
  image: string;
  lanes: Record<string, Item[]>;
  open: { title: string; text: string; from: string }[];
  work: { cycle: string; name: string; stage: string; tasks: { num: string; title: string; mark: string; did: string }[] }[];
};

export type Picture = { label: string; src: string; crop?: number[]; size?: number[] };

export type Review =
  | { kind: "decision"; key: string; ref: string; title: string; cycle: string; who: string; recommend: string; proxy: string;
      options: { mark: string; text: string }[]; pictures: Picture[] }
  | { kind: "asset" | "style"; key: string; ref: string; title: string; tool: string; state: string; what: string; old: boolean; views: string[]; said: string[] }
  | { kind: "check"; key: string; ref: string; title: string; cycle: string };

export type Model = { name: string; img: string; tool: string; st: St; state: string; old: boolean; sample: boolean; reference: boolean; what: string; rejected: number };

export type Board = {
  lanes: { key: string; label: string }[];
  stages: Stage[];
  asks: { title: string; text: string; from: string; stage: number }[];
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
  share: string | null;
  now: { cycle: string; name: string; stage: string } | null;
  counts: { problems: number; not_made: number; placeholders: number; undecided: number; review: number; done?: number; old_style?: number };
  stages: { name: string; complete: number | null }[];
  /** Everything the pages show — sent by kit 0.43.0 and later. Without it the kit's own page is shown. */
  board?: Board;
};

export function ago(iso: string): string {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}
