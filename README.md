# gamedev-kit-board

The dashboard of [claude-gamedev-kit](https://github.com/dudwns0921/claude-gamedev-kit): every game on your machine on one page — what waits on you across games, then each game's stages, review and assets — redrawn as the games change.

It runs on your own machine, next to the games. The kit installs and starts it; you do not clone this repository by hand.

## Start it

In any game that uses the kit, ask Claude to start the dashboard (or run it yourself):

```bash
python3 <kit>/skills/board/scripts/board.py serve
```

That clones this repository to `~/.config/gamedev-kit/board-app`, builds it (once per version), starts it on `http://localhost:3100`, and sends the game's board. Needs git and Node.js.
The sign-in password is made on the first run — it is `GAMEDEV_BOARD_PASSWORD` in `~/.config/gamedev-kit/board.env`. Run `serve` once in each game that should appear; after that every Claude turn in that game sends its board.

`serve --status` · `serve --stop`. After a restart of the machine, `serve` starts it again.

## From your phone or another computer

The server listens on your machine only. Reach it through one of:

- **Tailscale** (phone and laptop): install it on both devices, then on the machine running the dashboard `tailscale serve --bg 3100`. Open the https address it prints — only your own devices reach it.
- **SSH**: `ssh -L 3100:localhost:3100 <your machine>`, then open `http://localhost:3100` on the device you are on.

Do not open the port to the internet.

## What it does not do

It does not chat and does not run anything. Answering what waits on you: tap the answers on the Review tab and copy them into the game's Claude chat — or, for a game whose board is on a claude.ai link, answer there and press "Send to Claude".

## Run it by hand (development)

```bash
npm install
APP_PASSWORD=pw SESSION_SECRET=dev INGEST_TOKEN=dev npm run dev
```

Data goes to `.data/`. Point a game at it with `GAMEDEV_BOARD_URL=http://localhost:3000` and `GAMEDEV_BOARD_TOKEN=dev` (in the environment or `~/.config/gamedev-kit/board.env`), then `board.py push`.

It can also run on a host of your own (Vercel with a private Blob store: `BLOB_STORE_ID` or `BLOB_READ_WRITE_TOKEN`, and the three variables above) — then set `GAMEDEV_BOARD_URL` to that address by hand.

## How it fits together

| Path | What |
|---|---|
| `POST /api/ingest/<game>/check` | the kit lists the pictures its page shows (named by content); the answer is the ones missing |
| `PUT /api/ingest/<game>/file/<name>` | one picture or sound |
| `PUT /api/ingest/<game>/page` | the kit's own page, every page of it in one document |
| `PUT /api/ingest/<game>/summary` | the board as data (`board.json`) — everything the dashboard draws |
| `DELETE /api/ingest/<game>` | takes a game off (the next push from it puts it back) |
| `/` | your games |
| `/g/<game>` | one game: overview · review · stages · assets; checks for a newer board every 20 s |
| `/g/<game>/kit` | the kit's own page for that game |

Storage keys: `games/<game>/summary.json` · `page.html` · `f/<hash>.<ext>`.
