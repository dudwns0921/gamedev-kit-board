# Cycle 01 — first-flight

Started: 2026-01-05 · Commit a1b2c3d · Stage: Closed

## Goal
In one line: Fly one island's letters from the post office and drop them in its mailbox
Let's make the first flight: hold to go up, let go to glide, drop a letter in a mailbox.

## Decisions
- [x] D1. How does the plane climb? — ① hold to rise ② tap to flap · recommended: ① (Spec) → ① (2026-01-05)

## Spec

### To see by playing
- Does holding and letting go feel like flying, not falling?

## Design
### Assets needed
| Name | Kind | Size · length | Have | If missing |
|---|---|---|---|---|
| plane — the courier's paper plane | sprite | 128 px | `assets/art/plane.png` | a grey triangle |
| letter_bag — the bag on the counter | sprite | 160 px | `assets/art/letter_bag.png` | a box |
| island_small — a small island | sprite | 256 px | `assets/art/island_small.png` | an ellipse |
| mailbox — an island's mailbox | sprite | 96 px | `assets/art/mailbox.png` | a post |
| wind_loop — wind over the sea | looping sound | 8 s | none | silence |

## Tasks

### [x] T1. Make the plane rise and glide
- **Epic**: Take off
- **What**: The plane climbs while you hold and glides when you let go.
- **Change**: You can fly for the first time.
- **Where**: (written for the implementer)
- **GDD**: BAL.PLANE.RISE · BAL.PLANE.GLIDE
- **Check**: headless test; play one day
- **Risk**: low
- **Done**: Holding climbs and letting go glides; it feels light.

### [x] T2. Read the hold from touch and the space bar
- **Epic**: Foundation
- **What**: One button for the whole game: touch or space.
- **Change**: The same hold works on a phone and a keyboard.
- **Where**: (written for the implementer)
- **GDD**: INPUT.HOLD
- **Check**: headless test; play one day
- **Risk**: low
- **Done**: Touch and space both fly the plane.

### [x] T3. Place the first island and its mailbox
- **Epic**: Over the islands
- **What**: One island with a mailbox to fly to.
- **Change**: There is somewhere to go.
- **Where**: (written for the implementer)
- **Check**: headless test; play one day
- **Risk**: low
- **Done**: An island sits ahead with its mailbox on top.

### [x] T4. Drop a letter when you let go over a mailbox
- **Epic**: Drop the letters
- **What**: Letting go above a mailbox delivers a letter.
- **Change**: A delivery pays coins.
- **Where**: (written for the implementer)
- **GDD**: RULE.DROP.WINDOW · BAL.DROP.COINS
- **Check**: headless test; play one day
- **Risk**: low
- **Done**: A letter falls into the box and three coins pop up.

### [x] T5. Sort the morning bag
- **Epic**: Morning at the post office
- **What**: The day starts by filling the bag at the counter.
- **Change**: You choose which island to fly to first.
- **Where**: (written for the implementer)
- **GDD**: RULE.SORT.ROUTE
- **Check**: headless test; play one day
- **Risk**: low
- **Done**: The bag fills with one island's letters.

### [x] T6. End the day at dusk
- **Epic**: Dusk and the lighthouse
- **What**: The sun sets and the day closes.
- **Change**: A day has a beginning and an end.
- **Where**: (written for the implementer)
- **GDD**: RULE.DUSK.END
- **Check**: headless test; play one day
- **Risk**: low
- **Done**: The sky turns orange and the day's coins are counted.

## Order
- Wave 1: T1, T2, T5
- Wave 2: T3, T4, T6

## Play

### Screens
- Morning at the post office — `docs/capture/post-office.png`
- Take off — `docs/capture/take-off.png`
- Checked (ok): Does holding and letting go feel like flying, not falling? (2026-01-08)
