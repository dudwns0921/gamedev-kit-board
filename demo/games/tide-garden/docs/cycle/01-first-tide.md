# Cycle 01 — first-tide

Started: 2026-01-06 · Commit e5f6071 · Stage: Closed

## Goal
In one line: Plant at low tide and see the garden after the sea comes in
Plant, wait for the tide, see what grew.

## Decisions

## Spec

## Design

## Tasks

### [x] T1. Plant seeds on the wet sand
- **Epic**: Low tide
- **What**: Tap the sand to plant a seed.
- **Change**: The garden starts.
- **Where**: (written for the implementer)
- **GDD**: BAL.SEED.COST
- **Check**: headless test; play one day
- **Risk**: low
- **Done**: Seeds go in where you tap.

### [x] T2. Bring the tide in and out
- **Epic**: High tide
- **What**: The sea rises over the garden and falls again.
- **Change**: Time passes in tides.
- **Where**: (written for the implementer)
- **GDD**: BAL.TIDE.PERIOD
- **Check**: headless test; play one day
- **Risk**: low
- **Done**: The tide comes in every minute and a half.

## Order
- Wave 1: T1, T2

## Play

### Screens
- Low tide — `docs/capture/shore.png`
