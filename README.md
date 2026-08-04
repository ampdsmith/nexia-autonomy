# nexia-autonomy

**Quarantined Autonomy-Framework Donor**  
For possible future use inside NEXIA (the living digital world inside NEXA).

```
CLASSIFICATION:          QUARANTINED / UNVERIFIED DONOR PROTOTYPE
CANONICAL NEXA / NEXIA:  NO
FREE WILL PROVEN:        NO
CONSCIOUSNESS PROVEN:    NO
PERSONHOOD PROVEN:       NO
PRODUCTION STATUS:       NO
```

## Correction cycle (post independent review)

- Influence consumption is now explicit via `acceptedInfluenceIds` / `rejectedInfluenceIds` / `deferredInfluenceIds`.
- Duplicate / replayed influence IDs are rejected via a bounded processed-ID ledger.
- `stop()` uses a generation token. Stale deliberation results are discarded. Overlapping loops are prohibited.
- Unimplemented actions return `lifecycle: NOT_IMPLEMENTED`, `success: false`, `partial: false` and perform **zero** body or need mutation.
- Explicit action lifecycle: REQUESTED / VALIDATED / STARTED / INTERRUPTED / PARTIALLY_COMPLETED / COMPLETED / FAILED / NOT_IMPLEMENTED.
- Consent remains fail-closed donor-side only (`CONTRACT_PENDING`). No local valid path.
- Baseline mind renamed to `DeterministicBaselineMind`. Negated and ambiguous voice commands are rejected. Raw transcripts never appear in reasoning.
- Tests expanded to exercise CognitionLoop, stop, NOT_IMPLEMENTED non-mutation, and negation rejection.

## Run tests

```bash
npm install
npm test
```

## Known limitations (honest)

- No `package-lock.json` yet (deterministic install requires local `npm install` to generate it).
- No real world embodiment, physics, inventory, or facility systems.
- No GitHub Actions CI workflow yet.
- Consent envelope is a preflight that always blocks until canonical NEXA Intimacy integration exists.
- Advanced design targets (Observatory, Continuity Vault, etc.) remain design targets only.

## Branch discipline

- Base: `main` @ `73d121c929abb071cbc90d6a85d7e1b8208311ca`
- Work branch: `work/nexia-autonomy-donor-hardening-v1`
- Direct writes to main: forbidden
- New repositories: forbidden

Founder and final authority: Anthony D. Smith — Founder AMP
