# gamedev-kit-board

A private web app that shows where each of your games stands — the status board that [claude-gamedev-kit](https://github.com/dudwns0921/claude-gamedev-kit) draws, kept current, readable from a phone or any computer you sign in on.

The kit draws the board in each game repository and, at the end of every Claude turn, sends it here (`board.py push`). This app stores it and shows it. It does not chat and does not run anything; answering decisions stays on the kit's claude.ai link (the board's "Answer on Claude" button).

## Set up (once)

1. **Vercel** — import this repository as a project.
2. **Blob store** — in the project's Storage tab, create a Blob store with **private** access and connect it. That sets `BLOB_READ_WRITE_TOKEN`.
3. **Environment variables** (Project → Settings → Environment Variables):
   - `APP_PASSWORD` — what you type to sign in.
   - `SESSION_SECRET` — a long random string (`openssl rand -hex 32`).
   - `INGEST_TOKEN` — another long random string. The kit sends boards with it.
4. Redeploy, open the app, sign in. The list is empty until a game sends its board.

## Connect a game

On your machine, once — a file outside every repository, as the kit keeps its other keys:

```
# ~/.config/gamedev-kit/board.env
GAMEDEV_BOARD_URL=https://<your app>.vercel.app
GAMEDEV_BOARD_TOKEN=<the same value as INGEST_TOKEN>
```

In each game repository, in `kit.config.json`:

```json
"board": { "service": { "game": "<lowercase-id>" } }
```

Then, in that game, `python3 <kit>/skills/board/scripts/board.py push` once (or just let a turn end). The game appears in the list.

## Run locally

```bash
npm install
APP_PASSWORD=pw SESSION_SECRET=dev INGEST_TOKEN=dev npm run dev
```

Without `BLOB_READ_WRITE_TOKEN` the data goes to `.data/`. Point a game at it with `GAMEDEV_BOARD_URL=http://localhost:3000` and `GAMEDEV_BOARD_TOKEN=dev` (in the environment or the file above) to try it.

## How it fits together

| Path | What |
|---|---|
| `POST /api/ingest/<game>/check` | the kit lists the pictures its page shows (named by content); the answer is the ones missing |
| `PUT /api/ingest/<game>/file/<name>` | one picture or sound |
| `PUT /api/ingest/<game>/page` | the board — every page of it in one document, as the kit drew it |
| `PUT /api/ingest/<game>/summary` | the board as data (`board.json`) — what the list of games and the refresh read |
| `/` | your games |
| `/g/<game>` | one game's board; it checks for a newer one every 20 s |

Storage keys: `games/<game>/summary.json` · `page.html` · `f/<hash>.<ext>`.
