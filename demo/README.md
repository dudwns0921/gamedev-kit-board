# demo — the dashboard, photographed with sample games

The pictures of the dashboard in the kit's README and on the landing page come from here, so they never show anyone's real game and are taken again with one command whenever the dashboard changes.

```bash
npm install && npm run build      # at the repository root, once (or after the app changes)
cd demo && npm install            # once
npm run shots                     # every picture, into the repositories checked out beside this one
```

- `games/` — three made-up games (Paper Courier, Lantern Keeper, Tide Garden): kit config, GDD, cycle and playtest documents, backlog, pictures and sounds, in the shape the kit writes.
- `shots.mjs` — runs its own copy of the app on port 3199 with its data in a temporary folder (the dashboard you use is not touched), draws each game with the kit's board script, pushes it, and takes each picture listed in `SHOTS` with Chrome. A target whose repository is not beside this one (`../claude-gamedev-kit`, `../gamedev-kit-site`) is skipped.
- `art.mjs` — draws the games' pictures. Run it only after changing a scene: `node art.mjs`.

Then commit the pictures in the repositories they landed in. To show a new screen somewhere, add a line to `SHOTS`.
