# Cycle 02 — what-grows

Started: 2026-01-13 · Commit f607182 · Stage: Play

## Goal
In one line: Plants that need the tide, and shells the sea leaves behind
What grows, and what the sea brings.

## Decisions
- [x] D1. Do plants die if the tide misses them? — ① yes ② they wilt and recover · recommended: ② (Spec) → ② (2026-01-13)

## Spec

### To see by playing
- After two tides, can you tell which plants the sea reached?

## Design

## Tasks

### [x] T1. Grow plants the tide reaches
- **Epic**: High tide
- **What**: Plants the sea covers grow a step.
- **Change**: Where you plant matters.
- **Where**: (written for the implementer)
- **Check**: headless test; play one day
- **Risk**: low
- **Done**: Plants under the tide line grow after it goes out.

### [x] T2. Leave shells after high tide
- **Epic**: High tide
- **What**: The sea leaves a few shells on the sand.
- **Change**: There is something to pick up after each tide.
- **Where**: (written for the implementer)
- **Check**: headless test; play one day
- **Risk**: low
- **Done**: Two or three shells wash up each tide.

### [ ] T3. Let wilted plants recover
- **Epic**: Low tide
- **What**: A plant the sea missed droops but can come back.
- **Change**: A missed tide is a setback, not a loss.
- **Where**: (written for the implementer)
- **Check**: headless test; play one day
- **Risk**: low

## Order
- Wave 1: T1, T2
- Wave 2: T3

## Play

### Screens
- High tide — `docs/capture/shore.png`
