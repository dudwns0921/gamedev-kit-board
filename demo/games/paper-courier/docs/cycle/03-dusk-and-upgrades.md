# Cycle 03 — dusk-and-upgrades

Started: 2026-01-19 · Commit c3d4e5f · Stage: Build

## Goal
In one line: Dusk falls, the lighthouse lights the way home, and the day's coins buy the first upgrade
The end of the day should mean something: a lighthouse, a shop, an upgrade.

## Decisions
- [x] D1. When does the shop open? — ① at dusk only ② any time at the post office · recommended: ① (Spec) → ① (2026-01-19)
- [ ] D2. Which wing shape should the upgraded plane have? — ① swept ② wide ③ split tail · recommended: ① (reads faster at a glance) (Design)
  - why: The first upgrade changes how the plane looks; the three drafts are below.
- [ ] D3. Should the lantern upgrade last one day or for good? — ① one day ② for good · recommended: ② (fewer things to remember) (Spec)

## Spec

### To see by playing
- Does the lighthouse beam show you the way home at dusk?

## Design

### Assets needed
| Name | Kind | Size · length | Have | If missing |
|---|---|---|---|---|
| lighthouse — the lighthouse at dusk | sprite | 320 px | `assets/art/lighthouse.png` | a white tower |
| drop_ping — the delivery ping | sound effect | 0.4 s | placeholder `assets/sound/drop_ping.wav` | a beep |
| shop_bell — the shop's bell | sound effect | 0.6 s | none | silence |
| plane_wings — the upgraded wings | sprite | 128 px | none | the old plane |

## Tasks

### [x] T1. Turn the sky to dusk as the day ends
- **Epic**: Dusk and the lighthouse
- **What**: The last part of the day grows dark and orange.
- **Change**: You can see the day running out.
- **Where**: (written for the implementer)
- **GDD**: RULE.DUSK.END
- **Check**: headless test; play one day
- **Risk**: low
- **Done**: The sky fades to dusk in the last half minute.

### [x] T2. Light the lighthouse at dusk
- **Epic**: Dusk and the lighthouse
- **What**: The lighthouse turns on its beam when the sun sets.
- **Change**: The beam points the way back to the post office.
- **Where**: (written for the implementer)
- **Check**: headless test; play one day
- **Risk**: low
- **Done**: The beam sweeps toward home as the sun sets.

### [>] T3. Open the shop at dusk
- **Epic**: Dusk and the lighthouse
- **What**: A small shop opens at the post office after dusk.
- **Change**: Coins have something to buy.
- **Where**: (written for the implementer)
- **GDD**: BAL.SHOP.LANTERN
- **Check**: headless test; play one day
- **Risk**: low

### [ ] T4. Sell the lantern upgrade
- **Epic**: Dusk and the lighthouse
- **What**: The first thing to buy: a lantern for the plane.
- **Change**: With the lantern you can fly a little longer after dusk.
- **Where**: (written for the implementer)
- **GDD**: BAL.SHOP.LANTERN
- **Check**: headless test; play one day
- **Risk**: low
- **Waiting**: D3

### [!] T5. Show the upgraded wings
- **Epic**: Take off
- **What**: The plane looks different once upgraded.
- **Change**: You can see your upgrade while flying.
- **Where**: (written for the implementer)
- **Check**: headless test; play one day
- **Risk**: low
- **Waiting**: D2
- **Blocked**: waiting for the wing shape (D2)

### [ ] T6. Count the day's letters on the morning bag
- **Epic**: Morning at the post office
- **What**: The bag shows how many letters the day holds.
- **Change**: You know the day's size before you take off.
- **Where**: (written for the implementer)
- **GDD**: BAL.DAY.LETTERS
- **Check**: headless test; play one day
- **Risk**: low

## Order
- Wave 1: T1, T2, T6
- Wave 2: T3, T5
- Wave 3: T4 — sells what T3 opens

## Play

### Screens
- Over the islands — `docs/capture/islands-2.png`
- Drop the letters — `docs/capture/drop-2.png`
- Dusk and the lighthouse — `docs/capture/dusk.png`
