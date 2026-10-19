# Cycle 01 — one-night

Started: 2026-01-20 · Commit d4e5f60 · Stage: Plan

## Goal
In one line: One storm night — carry oil up, keep the flame, watch a ship pass
One night at the lighthouse.

## Decisions
- [ ] D1. How long is one night? — ① 5 minutes ② 10 minutes · recommended: ① (Spec)
- [ ] D2. Can the flame go out for good? — ① yes, the night is lost ② no, it can be relit · recommended: ② (Spec)

## Spec

## Design

## Tasks

### [ ] T1. Carry the oil up the stairs
- **Epic**: Climb the stairs
- **What**: You climb the tower with a can of oil.
- **Change**: The night starts with a climb.
- **Where**: (written for the implementer)
- **GDD**: BAL.OIL.CARRY
- **Check**: headless test; play one day
- **Risk**: low

### [ ] T2. Let the flame fade unless trimmed
- **Epic**: Keep the flame
- **What**: The flame grows weak unless you trim the wick.
- **Change**: Keeping the light is a job, not a switch.
- **Where**: (written for the implementer)
- **GDD**: RULE.FLAME.OUT
- **Check**: headless test; play one day
- **Risk**: low

## Order
- Wave 1: T1, T2

## Play

### Screens
- Climb the stairs — `docs/capture/stairs.png`
