# CLEOPATRA Replay-Authority Capacity Correction 04 Evidence

**Date:** 2026-08-09  
**Continuous work period started:** 2026-08-09 12:27 PM CDT  
**Founder and final authority:** Anthony D. Smith — Founder AMP  
**Executing builder:** CLEOPATRA — Lead Builder  
**Work order:** `NEXIA-AUTONOMY-DONOR-HARDENING-001-CLEOPATRA-TAKEOVER-01`  
**Repository:** `ampdsmith/nexia-autonomy`  
**Branch:** `work/nexia-autonomy-donor-hardening-v1`  
**Predecessor correction-03 evidence head:** `55f2905c863a3c6d25581bf29e7f4c0817bbd16d`  
**Founder delivery day:** Tuesday, 2026-08-11  
**Visual-proof hard gate:** ACTIVE

## Pre-evidence source identity

```text
CORRECTION-03 EVIDENCE HEAD:
55f2905c863a3c6d25581bf29e7f4c0817bbd16d

CORRECTION-04 SOURCE HEAD BEFORE THIS RECEIPT:
2ab505ab4263d34062a5bb928962e56d5fcbc302

RELATION:
4 COMMITS AHEAD / 0 BEHIND

CHANGED FILES:
4

PRESERVED MAIN:
73d121c929abb071cbc90d6a85d7e1b8208311ca
```

## Forward-only correction commits

```text
bf51ce54a4c5490c7f66b9b19c416cc2ed488e55
Bound replay authority without evicting one-time claims

2f0f223eeeb54eb296f41aa7a1f60c9ea1cfc9d8
Add replay authority capacity regression coverage

a0ce11a941e47c5b199a31ca237a8f047af22529
Add replay capacity regression to donor test command

2ab505ab4263d34062a5bb928962e56d5fcbc302
Document bounded replay authority correction 04
```

## Exact changed-path boundary from correction 03

1. `src/core/ReplayLedger.ts`
2. `src/tests/replay-ledger-capacity.test.ts` — added
3. `package.json`
4. `README.md`

No other source path changed in correction 04 before this evidence receipt.

## Builder-found defect — authoritative replay ledger had unbounded process growth

Correction 02 deliberately removed replay-authority eviction so old influence/intention identities could not become reusable after cache turnover. Continuous builder inspection found the remaining resource-safety problem: `InMemoryReplayLedger` had no capacity boundary at all.

Fresh builder reproduction against the predecessor implementation:

```text
claims_after_50000: 50000
next_claim: ACCEPTED
claims_after_next: 50001
```

The authoritative set would continue growing for every newly accepted one-time influence/intention identity during the process lifetime. The donor is non-production, but an authoritative security boundary should not silently become an unbounded memory-retention path.

## Correction

`InMemoryReplayLedger` now:

- accepts an explicit positive `maxClaims` constructor limit;
- defaults to 100,000 claims for the donor process;
- checks existing identity replay before the capacity gate, so an old identity remains `REPLAY` even after capacity is full;
- never evicts old authoritative identities;
- throws `REPLAY_LEDGER_CAPACITY_EXHAUSTED` for a new identity when capacity is exhausted;
- exposes claim count and capacity for bounded verification.

The existing `CognitionLoop` replay-authority adapter already fails closed on a throwing/unavailable replay ledger. Therefore a new influence at authority capacity is rejected as `REJECTED_REPLAY_LEDGER_UNAVAILABLE`; previously recorded identities remain `REJECTED_REPLAY`.

No production sizing, database persistence, process-restart durability, or canonical integration is claimed.

## New exact regression

`src/tests/replay-ledger-capacity.test.ts` verifies:

- first and second direct one-time claims are accepted in a two-slot ledger;
- a new third identity fails closed when capacity is reached;
- the oldest recorded identity remains replay-blocked after capacity is reached;
- ledger size remains exactly bounded without eviction;
- `CognitionLoop` accepts the first bounded influence;
- a subsequent new influence fails closed when replay authority is full;
- the old influence remains replay-blocked after capacity exhaustion.

## Fresh builder execution evidence

The current correction-04 source was executed in the same connector-reconstructed local verification workspace used for correction 03. No unauthenticated Git clone, repository dependency fabrication, provider, database, or external runtime was used.

```text
NODE:
v22.16.0

TYPESCRIPT:
5.8.3

TS-NODE:
10.9.2
```

### Strict TypeScript

```text
COMMAND:
tsc --noEmit
RESULT:
PASS
```

### TypeScript suites

```text
FULL HARDENING:
76 passed / 0 failed / 0 skipped

REPLAY / CANCEL:
12 passed / 0 failed / 0 skipped

CONSENT REPLAY CAPACITY:
10 passed / 0 failed / 0 skipped

REPLAY AUTHORITY CAPACITY:
8 passed / 0 failed / 0 skipped
```

### Build and compiled execution

```text
TYPESCRIPT BUILD:
PASS

COMPILED HARDENING:
76 passed / 0 failed

COMPILED REPLAY / CANCEL:
12 passed / 0 failed

COMPILED CONSENT CAPACITY:
10 passed / 0 failed

COMPILED REPLAY AUTHORITY CAPACITY:
8 passed / 0 failed

COMPILED DEMO:
EXIT 0
processedCount: 1
processedIntentionCount: 1
actionCount: 1
lastBoundaryRejection: null
```

Expected negative hardening logs remained present and asserted, including `COGNITION_STOPPED`, `DELIBERATION_TIMEOUT`, and `ACTION_TIMEOUT`.

## Package-install limitation remains explicit

```text
CLEAN NPM CI:
NOT PROVEN

COMPLETE REGISTRY-RESOLVED LOCK GRAPH:
NOT PROVEN

KNOWN EXECUTION-REGISTRY ISSUE:
@types/node@^20.11.0 unavailable in prior clean-install attempts

HAND-AUTHORED TRANSITIVE LOCK ENTRIES:
NO
```

The local verifier reused an already-installed Node type-definition copy bundled with the execution environment's existing `ts-node` installation only for local compilation. The repository lockfile was not altered to hide the limitation.

## Governance / non-actions

```text
NEW BRANCH / REPOSITORY: NO
DIRECT MAIN WRITE: NO
HISTORY REWRITE / FORCE PUSH: NO
DELETION: NO
PULL REQUEST: NO
MERGE / DEPLOYMENT / RELEASE: NO
CANONICAL NEXA / NEXIA CLAIM: NO
NEXA INTIMACY INTEGRATION: NO
PROVIDER / DATABASE / SECRET / PRODUCTION DATA: NO
SPENDING: $0.00
SELF-AUDIT / SELF-APPROVAL: NO
FOUNDER ACCEPTANCE: NO
COMPLETION DECLARED: NO
INDEPENDENT RE-AUDIT: REQUIRED
```

This receipt records builder execution and a successor candidate. It is not independent acceptance.