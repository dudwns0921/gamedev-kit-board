# gamedev-kit-board

The dashboard of [claude-gamedev-kit](https://github.com/dudwns0921/claude-gamedev-kit): every game on your machine on one page — what waits on you across games, then each game's stages, review and assets — redrawn as the games change.

It runs on your own machine, next to the games. The kit installs and starts it; you do not clone this repository by hand.

## Start it

In any game that uses the kit, ask Claude to start the dashboard (or run it yourself):

```bash
python3 <kit>/skills/board/scripts/board.py serve
```

That clones this repository to `~/.config/gamedev-kit/board-app`, builds it (once per version), starts it on `http://localhost:3100`, and sends the game's board. Needs git and Node.js.
There is no sign-in: it is yours, on your machine. Run `serve` once in each game that should appear; after that every Claude turn in that game sends its board.

`serve --status` · `serve --stop`. After a restart of the machine, `serve` starts it again.

## From your phone or another computer

The server listens on your machine only. Reach it through one of:

- **Tailscale** (phone and laptop): install it on both devices, then on the machine running the dashboard `tailscale serve --bg 3100`. Open the https address it prints — only your own devices reach it.
- **SSH**: `ssh -L 3100:127.0.0.1:3100 <your machine>`, then open `http://127.0.0.1:3100` on the device you are on.

Do not open the port to the internet, and do not use `tailscale funnel` — there is no password; who can reach it can use it.
The app answers only to `localhost`, `127.0.0.1` and a Tailscale name (`*.ts.net`; more in `BOARD_HOSTS`, comma-separated), and takes a change only from its own pages — another site open in your browser cannot reach it.

## What it does not do

It does not chat and does not run anything in a game — it only signals. Pick the answers on the Review tab (an option, approve, OK, "not needed") and send them:
they go to the game's inbox, the game's open Claude session is woken for them — or the next session you open picks them up — and the session does the work.
The page follows as the session redraws the board.

## Run it by hand (development)

```bash
npm install
INGEST_TOKEN=dev npm run dev
```

Data goes to `.data/`. Point a game at it with `GAMEDEV_BOARD_URL=http://localhost:3000` and `GAMEDEV_BOARD_TOKEN=dev` (in the environment or `~/.config/gamedev-kit/board.env`), then `board.py push`.

It has no sign-in, so it is not for hosting where others can reach it.

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
