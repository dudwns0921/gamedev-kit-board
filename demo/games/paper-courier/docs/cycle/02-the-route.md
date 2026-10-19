# Cycle 02 — the-route

Started: 2026-01-12 · Commit b2c3d4e · Stage: Closed

## Goal
In one line: Three islands in a row, wind between them, and birds that knock letters loose
A whole route: three islands, wind, and something that gets in the way.

## Decisions
- [x] D1. What gets in the way between islands? — ① birds ② rain clouds · recommended: ① (Spec) → ① birds (2026-01-12)

## Spec

### To see by playing
- Can you reach the third island in one glide with the wind behind you?

## Design

## Tasks

### [x] T1. Line up three islands along the route
- **Epic**: Over the islands
- **What**: The route now has three islands, each with a mailbox.
- **Change**: A day is a run from island to island.
- **Where**: (written for the implementer)
- **Check**: headless test; play one day
- **Risk**: low
- **Done**: Three islands sit along the route.

### [x] T2. Blow wind between the islands
- **Epic**: Over the islands
- **What**: Gusts push the plane forward between islands.
- **Change**: Riding the wind gets you farther.
- **Where**: (written for the implementer)
- **GDD**: BAL.WIND.GUST
- **Check**: headless test; play one day
- **Risk**: low
- **Done**: A gust behind you carries the plane to the next island.

### [!] T3. Let a bird knock one letter loose
- **Epic**: Over the islands
- **What**: A bird that bumps the plane drops one letter.
- **Change**: Birds are worth flying around.
- **Where**: (written for the implementer)
- **GDD**: RULE.BIRD.BUMP
- **Check**: headless test; play one day
- **Risk**: low
- **Blocked**: the bird's path crosses the islands in the route as built — the spec has no rule for that

### [x] T4. Give each delivery a pop and a sound
- **Epic**: Drop the letters
- **What**: A delivered letter flashes and rings.
- **Change**: You can tell a delivery happened without looking.
- **Where**: (written for the implementer)
- **Check**: headless test; play one day
- **Risk**: low
- **Done**: The mailbox flashes and a short ping plays.

### [x] T5. Save the day's coins
- **Epic**: Foundation
- **What**: Coins stay after you close the game.
- **Change**: Coming back keeps what you earned.
- **Where**: (written for the implementer)
- **Check**: headless test; play one day
- **Risk**: low
- **Done**: Coins are kept between visits.

## Order
- Wave 1: T1, T2, T5
- Wave 2: T3, T4

## Play

### Screens
- Over the islands — `docs/capture/islands.png`
- Drop the letters — `docs/capture/drop.png`
- Checked (ok): Can you reach the third island in one glide with the wind behind you? (2026-01-16)
