# CLAUDE.md — gamedev-kit-board

A single-user web app (Next.js) that shows the boards the claude-gamedev-kit plugin sends from game repositories — every game on one page.
It runs on the user's own machine: the kit's `board.py serve` clones this repository outside every game, builds it and starts it on localhost.
The kit lives in its own repository; the two meet in one place: what the kit's `board.py push` sends (see README "How it fits together").

## What it is for

The user wants to see where each game stands and what waits on them at a glance, which a chat cannot give — and, step by step, to handle that work from the page.
Seen from a phone or another computer through the user's own tunnel (Tailscale, an SSH forward); the server itself listens on localhost.
No chat and no prompt box here — Claude (desktop · app · terminal) is where the talking happens.

## Rules

- **One user, on their machine — no sign-in.** It listens on 127.0.0.1 and is reached from elsewhere through the user's own tunnel (tailscale serve, an SSH forward).
  What is guarded is the browser (`lib/guard.ts`, run by `proxy.ts` and again in each route): a request must name this machine (`localhost` · `127.0.0.1` · `*.ts.net` · `BOARD_HOSTS`),
  and one that changes something must come from this app's own pages. The kit sends with a token (`INGEST_TOKEN`), which `serve` makes and keeps in the user's `board.env`.
- **Game data stays on the machine.** Storage is `.data/` beside the app — nothing else.
- **Logic in `lib/`, routes stay thin.** Client components import only `lib/board.ts` (types and small helpers) — never the storage code.
- **The data shape is the kit's.** `lib/board.ts` mirrors the kit's `board.json`. A field the kit adds passes through; change the kit first, then this.
- **It only signals — it never acts on a game.** The one thing it writes into a game is a batch of answers in its inbox (`lib/inbox.ts`): an option, approve, OK,
  "not needed". The game's Claude session is woken for it and does the work; this app learns what happened from the board the session sends. No scripts run here, no Claude runs here.
- **The kit drives it.** What `serve` runs (`npm install`, `npm run build`, `npm run start -- -p <port> -H 127.0.0.1`, the environment variables) is a contract with the kit — change both together.
- Code, comments, UI text and commit messages in English.

## Verification

```bash
npm run typecheck
npm run build
```

End to end: run it (README "Run it by hand"), point a sample game at it, `board.py push`, open the game in each theme and on a phone width.

The pictures of the dashboard elsewhere (the kit's README, the landing page) are taken from `demo/` — made-up games, photographed by `demo/shots.mjs` in one go. After a change to what the pages look like, run it again (`demo/README.md`).

## Where it stands, and what is next

Done: the dashboard of games (what waits across games) · one game drawn from data (overview · review · stages · assets), redrawn in place as a newer board arrives ·
four themes (system · light · dark · kit) · started by the kit's `serve`.

Done since: **Not needed** on a decision (or an asset attempt waiting for approval) is sent to the session like any answer.
**Answers straight to the session**: the Review tab holds everything that waits (every cycle's open decisions, the GDD's open questions, images, checks);
"Send to the session" writes one batch into the game's `<board>/inbox/` (`lib/inbox.ts`); the kit's watcher wakes the open session for it (or tells the next one),
and each card shows sent → taken until the board no longer asks it.
The page never asks on a clock: it holds one connection (`/g/<game>/events`, `lib/follow.ts`) and is told when a newer board arrives or the inbox changes —
the files are watched. Refresh (↻) reads both once more and reconnects.

A batch no open session took (or one taken by a session that never read it) is shown as waiting for the next session — nothing more.

**For you** cards (the kit's `cycle.py todo`): what only the user can do outside the chat, with its steps and the text to copy in one tap; one that waits for a file
leaves when the kit's watcher sees the file and sends a newer board. A decision can carry sounds (mp3 · m4a · wav), heard on its card. The **Assets** tab is one table grouped by epic in play order — what each asset is, its part, the cycle that listed it, its state, the code files that name it (folded). The games page says when a game's session is at a good place to `/clear`.
The game's page has six tabs, in the shape of a tracker: **Epics** (opened first) · **Cycle** · **Play** · **Backlog** · **Review** · **Assets**. The **Epics** tab lays the game out as epics — each stage of play, and Foundation for what no stage owns (the kit's `Epic:` line on every task): the epic cards (words only) stay on top, the chosen one opens under them with its cycles in one row and the tasks of the one picked below it (playtests and its backlog as their own groups). The **Cycle** tab is one cycle as a board — its goal and stages on top, its tasks in four columns (to do · in hand · blocked · done); any cycle can be picked from the row above. A task (on either) opens in a side panel that says only what the user needs: what it is, how the game will change, what changed (or why it is stuck) — the kit's `What` · `Change` · `Done` lines, one plain sentence each — and its GDD ids. Nothing written for the implementer is shown. The **Backlog** tab is what was put off for a later cycle (the game's `docs/backlog.md`), by epic.
**Play** is the one place screens of the game are seen: every run of the play route the kit shoots at the end of each build (its `plays`, newest first) — a run's stops in play order by stage, "Beside the run before" pairing each stop with the run before it, and any stop across every run. Pictures keep their own shape (a phone game's screens stand upright). A done task's panel links to the run of its build, at its epic. No other tab shows screens of the game; a decision chosen by eye still carries its candidates.
**Several sessions at once** (the kit's `cycle.py take`, each session on its own cycle): the kit sends every cycle in hand as `active`; the games page and the game's bar name them all (`Cycles 11 · 13 · 14`), and the Cycle tab marks each in hand — and the one building — with what of it waits on the user. A board from an older kit has no `active`: the newest cycle stands for it.

Next, in order:
1. Confirm in use that the desktop app wakes for a batch (the kit's monitor, or its after-turn hook).
2. Views a chat cannot give: change over time (decisions → build → play per cycle), all games side by side, a notification when a decision is waiting.
3. The Rules page: the user's rules from every game — sent with the board by the kit, never read here by running a script — what went to the kit, what the kit took in;
   "drop my copy" is a signal to a session like any answer.
