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

## CLEOPATRA independent-audit correction 02

Work order: `NEXIA-AUTONOMY-DONOR-HARDENING-001-CLEOPATRA-TAKEOVER-01`

This forward-only correction responds to MINERVA Issue #2 return `5231707694` and also closes the already-known distinct-cancel gap before re-audit:

- introduces an explicit donor-side `ReplayLedger` authority boundary for influence and intention identities;
- keeps bounded local replay sets only as performance caches, never as replay authority;
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
```

Focused replay/cancel correction only:

```bash
npm run test:replay
```

## Known limitations

- This is a donor framework, not a final Resident mind, NEXIA runtime, embodiment system, physics layer, inventory system, or production service.
- `DeterministicBaselineMind` is a fixed demonstration policy, not open-ended cognition.
- Most actions remain `NOT_IMPLEMENTED` and perform zero state mutation.
- Consent remains preflight-only and always blocks sensitive execution.
- Cooperative cancellation requires extension Minds and asynchronous action adapters to honor the provided `AbortSignal`; JavaScript cannot forcibly terminate a non-cooperative promise.
- The default replay ledger is process-lifetime only and is not production persistence.
- No canonical NEXA Intimacy contract, live provider, database, production identity, deployment, or external action is connected.
- No GitHub Actions CI workflow is installed or claimed passed.
- The committed `package-lock.json` contains only root intent and is not a complete registry-resolved transitive lock graph.
- Package-registry access and a clean `npm ci` remain unproven until executed in a connected package-install environment.

## Branch discipline

```text
Preserved main: 73d121c929abb071cbc90d6a85d7e1b8208311ca
Authorized branch: work/nexia-autonomy-donor-hardening-v1
Audit correction 01 head: 3e336392f6f08f4659b123a15a52fa7952e2e2d3
Direct writes to main: forbidden
New branches or repositories: forbidden
```

Founder and final authority: Anthony D. Smith — Founder AMP
