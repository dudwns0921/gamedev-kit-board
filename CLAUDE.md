# CLAUDE.md — gamedev-kit-board

A single-user web app (Next.js) that shows the boards the claude-gamedev-kit plugin sends from game repositories — every game on one page.
It runs on the user's own machine: the kit's `board.py serve` clones this repository outside every game, builds it and starts it on localhost.
The kit lives in its own repository; the two meet in one place: what the kit's `board.py push` sends (see README "How it fits together").

## What it is for

The user wants to see where each game stands and what waits on them at a glance, which a chat cannot give — and, step by step, to handle that work from the page.
Seen from a phone or another computer through the user's own tunnel (Tailscale, an SSH forward); the server itself listens on localhost.
No chat and no prompt box here — Claude (desktop · app · terminal) is where the talking happens.

## Rules

- **One user.** A password signs in; a signed cookie keeps it; the kit sends with a separate token. No accounts, no sharing. `serve` makes all three and keeps them in the user's `board.env`.
- **Game data stays on the machine.** Storage is `.data/` beside the app. (A private Vercel Blob store is still read when its variables are set — for a user who hosts it elsewhere.)
- **Logic in `lib/`, routes stay thin.** Client components import only `lib/board.ts` (types and small helpers) — never the storage code.
- **The data shape is the kit's.** `lib/board.ts` mirrors the kit's `board.json`. A field the kit adds passes through; change the kit first, then this.
- **Acting on a game runs the kit's own scripts, nothing else.** `lib/act.ts` turns a request into one fixed command (the cycle skill's `drop`, the asset skill's `drop`), with arguments checked against strict patterns and no shell; then it runs the board's `push` back to this dashboard. Only for a game whose board came from this machine (`local` in its summary).
- **The kit drives it.** What `serve` runs (`npm install`, `npm run build`, `npm run start -- -p <port> -H 127.0.0.1`, the environment variables) is a contract with the kit — change both together.
- Code, comments, UI text and commit messages in English.

## Verification

```bash
npm run typecheck
npm run build
```

End to end: run it (README "Run it by hand"), point a sample game at it, `board.py push`, sign in, open the game in each theme and on a phone width.

## Where it stands, and what is next

Done: sign-in · the dashboard of games (what waits across games) · one game drawn from data (overview · review · stages · assets), redrawn in place as a newer board arrives ·
four themes (system · light · dark · kit) · the kit's own page at `/g/<game>/kit` · started by the kit's `serve`.

Next, in order:
Done since: **Not needed** on a decision (or an asset attempt waiting for approval) withdraws it in the game itself and redraws the board.

1. **Answers straight to the game.** A tap on the Review tab is written into the game's folder (the app runs on the same machine), and the session picks it up on its next turn — no copying.
2. **Wake the session.** A Claude Code channel (an MCP server that puts a message into a running session) tells the game's session that answers arrived, so it acts at once.
3. Views a chat cannot give: change over time (decisions → build → play per cycle), all games side by side, a notification when a decision is waiting.
