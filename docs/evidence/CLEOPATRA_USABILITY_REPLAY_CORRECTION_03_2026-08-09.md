# CLEOPATRA Usability / Replay Correction 03 Evidence

**Date:** 2026-08-09  
**Work period started:** 2026-08-09 12:27 PM CDT  
**Founder and final authority:** Anthony D. Smith — Founder AMP  
**Executing builder:** CLEOPATRA — Lead Builder  
**Work order:** `NEXIA-AUTONOMY-DONOR-HARDENING-001-CLEOPATRA-TAKEOVER-01`  
**Repository:** `ampdsmith/nexia-autonomy`  
**Branch:** `work/nexia-autonomy-donor-hardening-v1`  
**Prior independent re-audit head:** `95d2260b735b6b20ccd7324afb26d9b8fc723a03`  
**Founder delivery day:** Tuesday, 2026-08-11  
**Visual-proof hard gate:** ACTIVE

## Pre-evidence source identity

```text
PRIOR RE-AUDIT / CORRECTION-02 HEAD:
95d2260b735b6b20ccd7324afb26d9b8fc723a03

USABILITY / REPLAY CORRECTION-03 SOURCE HEAD BEFORE THIS RECEIPT:
1faaf810ec87ac50f8970ee42409dfb71c635c28

RELATION:
5 COMMITS AHEAD / 0 BEHIND

CHANGED FILES:
5

PRESERVED MAIN:
73d121c929abb071cbc90d6a85d7e1b8208311ca
```

## Forward-only correction commits

```text
9f55ec320763d52357ef2f51030f10826db9d4d7
Make donor demo prove accepted influence processing

807a073e70e864162fe7d52cbc344c74b76770dc
Fail closed when consent replay ledger reaches capacity

75c2c307a6c9ec5ed1e7a01985cb2195bb75f902
Add consent replay capacity regression coverage

f318b82ab6d3edcd795a5d619b95fe0a4874efa8
Add consent capacity regression to donor test command

1faaf810ec87ac50f8970ee42409dfb71c635c28
Document usability and consent replay correction 03
```

## Exact changed-path boundary from correction 02

1. `src/demo.ts`
2. `src/core/ConsentBoundary.ts`
3. `src/tests/consent-replay-capacity.test.ts` — added
4. `package.json`
5. `README.md`

No other source path changed in correction 03 before this evidence receipt.

## Defect 1 — shipped demo accepted input without proving processing

### Reproduction at prior head

The prior shipped demo awakened the Resident, then injected `walk`, waited only 250 ms, and stopped the Resident while the default cognition interval was 1500 ms.

Fresh execution against the connector-reconstructed exact prior source produced:

```text
Influence ingestion: ACCEPTED
processedCount: 0
processedIntentionCount: 0
actionCount: 0
```

The command exited without proving that the accepted influence had entered a cognition cycle.

### Correction

`src/demo.ts` now:

- constructs and ingests the bounded influence before awakening;
- requires ingestion status `ACCEPTED`;
- requires `awaken()` to succeed;
- waits 1750 ms, longer than the default 1500 ms cognition tick;
- checks the processed status before shutdown;
- exits nonzero unless `processedCount`, `processedIntentionCount`, and `actionCount` are all at least 1;
- explicitly states that the demo proves bounded ingestion/cognition flow only and that most physical actions remain `NOT_IMPLEMENTED`.

### Fresh corrected demo execution

TypeScript and compiled-JavaScript demo executions both returned exit 0 with:

```text
processedCount: 1
processedIntentionCount: 1
actionCount: 1
lastBoundaryRejection: null
```

## Defect 2 — consent one-time replay evidence expired through bounded eviction

### Reproduction at prior head

A bounded `ConsentReplayLedger(3)` evicted old decision/reference identities when capacity was exceeded. A previously presented one-time decision therefore returned to `CONTRACT_PENDING` instead of `REPLAY` after enough newer entries.

Observed builder-side reproduction:

```text
first: CONTRACT_PENDING
fillers: CONTRACT_PENDING
replay_after_eviction: CONTRACT_PENDING
```

Sensitive execution was still blocked because canonical NEXA Intimacy is not integrated, but the advertised one-time replay property was not durable for the lifetime of the bounded ledger.

### Correction

`ConsentReplayLedger` now:

- does not evict previously recorded one-time identities;
- remains bounded by its configured capacity;
- returns failure when capacity is exhausted;
- causes `validateExternalConsent()` to return `REPLAY_LEDGER_FULL`, always with `allowed: false`;
- preserves old decision/reference identities so their later reuse remains `REPLAY`;
- exposes bounded entry-count/capacity status for testing.

This remains a process-lifetime non-production donor ledger. It does not claim canonical NEXA Intimacy, database, restart, distributed, or production persistence.

## Fresh builder execution evidence

The exact correction-03 source was reconstructed locally from authenticated GitHub file content. Direct shell GitHub access was unavailable, so no unauthenticated clone was claimed. The already-installed Node type definitions bundled with the execution environment's global `ts-node` installation were wired only into the local verification workspace; repository dependencies and lockfiles were not altered to hide the known registry limitation.

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

### Full original hardening suite

```text
COMMAND:
ts-node src/tests/hardening.test.ts

RESULT:
76 passed / 0 failed / 0 skipped
```

Expected negative-boundary logs remained present and asserted, including `COGNITION_STOPPED`, `DELIBERATION_TIMEOUT`, and `ACTION_TIMEOUT`.

### Replay / cancel suite

```text
COMMAND:
ts-node src/tests/replay-ledger-correction.test.ts

RESULT:
12 passed / 0 failed / 0 skipped
```

### New consent replay-capacity suite

```text
COMMAND:
ts-node src/tests/consent-replay-capacity.test.ts

RESULT:
10 passed / 0 failed / 0 skipped
```

Coverage includes:

- bounded capacity reached without eviction;
- a new decision fails closed as `REPLAY_LEDGER_FULL` when capacity is exhausted;
- the oldest recorded decision remains `REPLAY` after capacity is reached;
- `ActionSystem` preserves the same fail-closed capacity semantics.

### TypeScript build and compiled execution

```text
COMMAND:
tsc
RESULT:
PASS

COMPILED REPLAY / CANCEL:
12 passed / 0 failed

COMPILED CONSENT CAPACITY:
10 passed / 0 failed

COMPILED DEMO:
EXIT 0
processedCount: 1
processedIntentionCount: 1
actionCount: 1
```

## Package-install limitation remains open and explicit

The committed `package-lock.json` remains root-only. Earlier clean `npm ci` attempts in the execution registry failed because `@types/node@^20.11.0` was unavailable there.

```text
CLEAN NPM CI:
NOT PROVEN

COMPLETE REGISTRY-RESOLVED LOCK GRAPH:
NOT PROVEN

HAND-AUTHORED TRANSITIVE LOCK ENTRIES:
NO
```

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

This receipt is evidence for a successor re-audit. It does not itself constitute independent acceptance.