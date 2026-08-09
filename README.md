# nexia-autonomy

**Quarantined Autonomy-Framework Donor**  
For possible future review inside NEXIA, the living digital world inside NEXA.

```text
CLASSIFICATION:             QUARANTINED / UNVERIFIED DONOR PROTOTYPE
CANONICAL NEXA / NEXIA:     NO
NEXA INTIMACY INTEGRATION:  NO
FREE WILL PROVEN:           NO
CONSCIOUSNESS PROVEN:       NO
PERSONHOOD PROVEN:          NO
PRODUCTION STATUS:          NO
```

## CLEOPATRA bounded walk usability correction 06

Work order: `NEXIA-AUTONOMY-DONOR-HARDENING-001-CLEOPATRA-TAKEOVER-01`

Continuous usability inspection found that the shipped demo could prove an action attempt occurred while the actual `walk` action still returned `NOT_IMPLEMENTED`. That was not strong enough to demonstrate a usable donor path.

Correction 06 adds one bounded, explicitly local donor-side movement behavior:

- `ActionSystem` now implements `walk` as a bounded location transition;
- destination must be a non-empty trimmed string of at most 200 characters;
- missing, blank, or oversized destinations fail closed without location mutation;
- an already-aborted action signal rejects before mutation;
- caller-owned initial body state remains cloned and is not mutated;
- `run`, `hop`, `jump`, `skip`, and the remaining unimplemented actions stay `NOT_IMPLEMENTED`;
- the shipped demo now exits nonzero unless its accepted `walk` influence is processed and the Resident body location changes from `home` to `nearby`;
- dedicated `walk-action-usability.test.ts` regression coverage verifies the successful transition and negative boundaries.

This is a local donor-state transition only. It does not claim canonical world navigation, pathfinding, collision avoidance, physics, GeoOS integration, deployment, or production embodiment.

## CLEOPATRA influence-factory boundary correction 05

Continuous public-API usability inspection found that the mouse/touch factory helpers could construct events that the cognition ingestion boundary would later reject. The factories accepted out-of-range mouse buttons, empty optional target/gesture strings, duplicate/fractional touch IDs, and unknown runtime fields.

Correction 05 aligns the public constructors with the already-hardened ingestion schema:

- mouse factory validates finite coordinates, button integer range `0-5`, bounded non-empty optional target, and known keys only;
- touch factory validates 1-10 points, integer unique touch IDs, finite coordinates, bounded non-empty optional gesture/target, and known payload/point keys only;
- returned content is rebuilt from validated known fields instead of blindly spreading caller objects;
- new factory-boundary regression coverage proves valid mouse/touch creation and rejection of malformed runtime payloads.

## CLEOPATRA replay-authority capacity correction 04

Continuous builder inspection after correction 03 found that `InMemoryReplayLedger` preserved replay authority correctly but retained accepted influence/intention identities without any capacity boundary. A sufficiently long-lived or adversarial donor process could therefore turn replay protection into unbounded process-memory growth.

Correction 04:

- gives `InMemoryReplayLedger` an explicit positive bounded capacity;
- keeps the default donor capacity at 100,000 one-time identity claims;
- never evicts old authoritative replay identities to make room for new ones;
- returns `REPLAY` for an already-recorded identity even when capacity is full;
- throws a bounded capacity-exhaustion error for a new identity once capacity is full;
- relies on the existing `CognitionLoop` fail-closed replay-authority boundary so capacity exhaustion rejects new influence/intention identity claims instead of silently weakening replay protection;
- adds direct and cognition-boundary regression coverage for capacity exhaustion.

### Replay-authority capacity limitation

The default replay authority remains an in-memory, process-lifetime donor implementation. Its 100,000-claim capacity is a bounded safety limit, not production sizing guidance. Capacity exhaustion blocks new one-time identity claims until a separately governed replacement ledger/process is provided. No automatic eviction, database persistence, process restart durability, or canonical production behavior is claimed.

## CLEOPATRA usability / replay correction 03

This forward-only usability pass continued the same authorized donor-hardening lane:

- the shipped demo now queues its bounded influence before awakening the Resident and waits long enough for the default cognition tick to process it;
- the demo fails loudly if accepted input is never processed, instead of exiting successfully with zero processed influences, zero processed intentions, and zero actions;
- `ConsentReplayLedger` no longer evicts old one-time decision/reference identities when its bounded capacity is reached;
- when consent replay capacity is exhausted, new exact-instance preflights fail closed as `REPLAY_LEDGER_FULL` rather than deleting old replay evidence;
- old consent decisions remain replay-blocked after capacity is reached;
- regression coverage exercises the direct consent boundary and the `ActionSystem` boundary at capacity.

### Consent replay capacity limitation

The donor consent replay ledger remains in-memory and process-lifetime only. It is deliberately bounded. Once capacity is exhausted, the donor blocks new exact-instance consent preflights rather than weakening one-time replay protection. This is not canonical NEXA Intimacy persistence or production storage.

## CLEOPATRA independent-audit correction 02

This earlier forward-only correction responded to MINERVA Issue #2 return `5231707694` and also closed the distinct-cancel gap before re-audit:

- introduced an explicit donor-side `ReplayLedger` authority boundary for influence and intention identities;
- kept bounded local replay sets only as performance caches, never as replay authority;
- the default donor ledger retains claims without eviction for the lifetime of the process and is shared across reconstructed `CognitionLoop` instances;
- callers may inject a separately governed replay-ledger implementation when stronger persistence is available;
- a missing or throwing authoritative replay ledger fails closed instead of accepting an unverifiable identity;
- replay claims are namespaced by identity kind and Resident ID;
- influence IDs remain one-time after more than 1,000 local-cache insertions and after loop reconstruction;
- intention IDs remain one-time after more than 200 local-cache insertions and after loop reconstruction;
- `cancel` is represented separately from `stop` and produces persistent `CANCELLED` state until separately authorized resume.

### Replay-retention limitation

`InMemoryReplayLedger` is intentionally a **non-production process-lifetime donor implementation**. It preserves identity claims across reconstructed loop objects only while the same process/ledger lifetime is retained. It does **not** claim host-restart, crash-recovery, database, distributed, or production durability. A production integration would require a separately authorized durable implementation of the same `ReplayLedger` contract.

## CLEOPATRA independent-audit correction 01

This earlier narrow audit correction:

- corrected `CONTRIBUTING.md` so current documentation contains no unsupported autonomy, feeling, citizenship, personhood, or free-will claims;
- added bounded seen-at-ingestion replay caching;
- made stop and pause results persistent until separately authorized resume;
- passed `AbortSignal` through Mind deliberation and asynchronous action execution boundaries;
- bound consent preflight to the exact intention instance, action, scope, actor, target, expected canonical authority, opaque verification reference, one-time reference, and replay ledger;
- continued to return `CONTRACT_PENDING` for all well-shaped sensitive-action preflight attempts;
- rejected duplicate IDs inside deliberation arrays instead of silently collapsing them;
- validated directly constructed mouse and touch payloads at the cognition ingestion boundary;
- added executable negative tests for each correction.

## Run

```bash
npm install
npm test
npm run build
npm run demo
```

Focused checks:

```bash
npm run test:replay
npm run test:consent
npm run test:replay-capacity
npm run test:factories
npm run test:walk
```

## Known limitations

- This is a donor framework, not a final Resident mind, NEXIA runtime, embodiment system, physics layer, inventory system, or production service.
- `DeterministicBaselineMind` is a fixed demonstration policy, not open-ended cognition.
- Bounded local `walk`, `fall`, `getUp`, `idle`, and `observe` behavior exists; most other actions remain `NOT_IMPLEMENTED` and perform zero state mutation.
- The bounded `walk` transition is local donor state only; it does not provide canonical navigation, pathfinding, collision avoidance, physics, or GeoOS integration.
- Consent remains preflight-only and always blocks sensitive execution.
- Cooperative cancellation requires extension Minds and asynchronous action adapters to honor the provided `AbortSignal`; JavaScript cannot forcibly terminate a non-cooperative promise.
- The default replay ledger and consent replay ledger are process-lifetime only and are not production persistence.
- Replay-authority capacity exhaustion intentionally blocks new identity claims instead of evicting old replay evidence.
- No canonical NEXA Intimacy contract, live provider, database, production identity, deployment, or external action is connected.
- No GitHub Actions CI workflow is installed or claimed passed.
- The committed `package-lock.json` contains only root intent and is not a complete registry-resolved transitive lock graph.
- Package-registry access and a clean `npm ci` remain unproven until executed in a connected package-install environment.

## Branch discipline

```text
Preserved main: 73d121c929abb071cbc90d6a85d7e1b8208311ca
Authorized branch: work/nexia-autonomy-donor-hardening-v1
Audit correction 01 head: 3e336392f6f08f4659b123a15a52fa7952e2e2d3
Audit correction 02 evidence head: 95d2260b735b6b20ccd7324afb26d9b8fc723a03
Usability / replay correction 03 evidence head: 55f2905c863a3c6d25581bf29e7f4c0817bbd16d
Replay-authority capacity correction 04 evidence head: c58ef024ffffae1ff6fb1bffdd19901ce34c56ab
Influence-factory boundary correction 05 evidence head: 54f8b5e75f336baab04b75d94b347fe30668d61e
Direct writes to main: forbidden
New branches or repositories: forbidden
```

Founder and final authority: Anthony D. Smith — Founder AMP
