# CLAUDE.md — gamedev-kit-board

A private, single-user web app (Next.js on Vercel, Vercel Blob private store) that shows the status boards the claude-gamedev-kit plugin sends from game repositories.
The kit lives in its own repository; this app only receives and shows. The two meet in one place: what the kit's `board.py push` sends (see README "How it fits together").

## What it is for

The user wants to know, from a phone or any other computer, where each game stands and what waits on them — at a glance, which a chat cannot give.
So this is **visualization only**: no chat, no prompt box, no buttons that run agents — Claude (desktop · app) is where the talking and the doing happen.
Answering decisions stays on the kit's claude.ai link for now ("Send to Claude" there wakes the game's session).

## Rules

- **One user.** A password signs in; a signed cookie keeps it; the kit sends with a separate token. No accounts, no sharing.
- **Game data stays private.** The Blob store is private; pictures are served through the app after the sign-in check, never by a public URL.
- **Logic in `lib/`, routes stay thin** — so a later split into a long-running server (see "Later") moves code instead of rewriting it.
- **The data shape is the kit's.** `lib/games.ts` mirrors the kit's `board.json`. A field the kit adds passes through; change the kit first, then this.
- Code, comments, UI text and commit messages in English.

## Verification

```bash
npm run typecheck
npm run build
```

End to end: run it locally (README "Run locally"), point a sample game at it, `board.py push`, sign in, open the game.

## Where it stands, and what is next

Done (first version): sign-in · the list of games (completion, current cycle and stage, what waits, when updated) · one game's board as the kit drew it, refreshed when a newer one arrives · the ingest API · local `.data/` storage when no Blob store is connected. Checked locally end to end; not yet deployed.

Next, in order:
1. Deploy (the user creates the Vercel project, the private Blob store and the environment variables — README "Set up").
2. Connect the user's games and use it for a few cycles; what gets in the way goes in the user's private records, not here.
3. Views a chat cannot give, drawn from data rather than the kit's page: change over time (decisions → build → play per cycle), all games side by side, "a decision is waiting" as a push notification (PWA).
4. Later, if it earns it: decisions answered here too — needs a way into the game's session (a Claude Code channel MCP server) and would be the reason for a long-running server beside this app.
