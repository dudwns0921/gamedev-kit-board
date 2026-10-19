# Paper Courier

## 1. Pitch
A paper plane carries the island post, one day at a time.

## 4. Rules
Hold to rise, let go to glide, let go over a mailbox to deliver.

## 8. Open questions

- **Rain**: does a wet letter count as delivered?

---

## Appendix A. Sync table

### A.1 Balance numbers

| ID | Value | Source | Code location | State | Note |
|---|---|---|---|---|---|
| BAL.DAY.LENGTH_SEC | 180 | 4 | src/day.js:DAY_LENGTH | synced | one day |
| BAL.DAY.LETTERS | 6~9 | 4 | src/day.js:LETTERS | synced | letters a day |
| RULE.SORT.ROUTE | the bag holds one island's letters | 4 | src/sort.js:route | synced |  |
| BAL.PLANE.RISE | 3.2 | 4 | src/plane.js:RISE | synced | m/s while held |
| BAL.PLANE.GLIDE | 0.6 | 4 | src/plane.js:GLIDE | synced | fall while gliding |
| INPUT.HOLD | touch · space | 4 | src/input.js:HOLD | synced |  |
| BAL.WIND.GUST | 1.5 | 4 | src/wind.js:GUST | synced |  |
| RULE.BIRD.BUMP | a bird knocks one letter loose | 4 | — | missing |  |
| RULE.DROP.WINDOW | over the box ± 1.2 m | 4 | src/drop.js:WINDOW | synced |  |
| BAL.DROP.COINS | 3 | 4 | src/drop.js:COINS | mismatch | code says 2 |
| RULE.DUSK.END | the day ends when the sun touches the sea | 4 | src/day.js:dusk | synced |  |
| BAL.SHOP.LANTERN | 40 | 4 | — | missing | the first upgrade |
