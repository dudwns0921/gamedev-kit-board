# Cycle 04 — rain-clouds

Started: 2026-01-21 · Commit d4e5f6a · Stage: Plan

## Goal
In one line: Rain clouds drift over the far islands and soak the letters they catch
The far islands should be harder to reach than the near ones.

## Decisions
- [x] D1. What does a rain cloud do to a letter? — ① soaks it, worth half ② washes it away · recommended: ① (Spec) → ① (2026-01-21)

## Spec

### To see by playing
- Can you see a rain cloud early enough to fly around it?

## Design

## Tasks

### [ ] T1. Drift rain clouds over the far islands
- **Epic**: Over the islands
- **What**: Grey clouds float slowly across the last two islands.
- **Change**: The far islands have something to fly around.
- **Where**: (written for the implementer)
- **GDD**: RULE.BIRD.KNOCK
- **Check**: headless test; play one day
- **Risk**: low

### [ ] T2. Soak the letters a cloud catches
- **Epic**: Drop the letters
- **What**: A letter flown through rain is worth half when dropped.
- **Change**: Flying around clouds pays.
- **Where**: (written for the implementer)
- **GDD**: BAL.DROP.COINS
- **Check**: headless test; play one day
- **Risk**: low

### [ ] T3. Show a soaked letter on the bag
- **Epic**: Morning at the post office
- **What**: Soaked letters look darker in the bag.
- **Change**: You can tell how many letters are still dry.
- **Where**: (written for the implementer)
- **Check**: headless test; play one day
- **Risk**: low

## Order
- Wave 1: T1, T3
- Wave 2: T2 — soaks what T1 brings
