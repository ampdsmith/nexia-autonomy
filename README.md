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

## Correction cycle 002

- Removed stale `SimpleAutonomousMind` (interface mismatch).
- Consent preflight: no VALID; actor/target/action/authority fields; always CONTRACT_PENDING for execution.
- Influence ingestion returns explicit status (pending duplicate, processed, malformed, wrong resident, etc.).
- Deliberation envelope IDs validated against active set only; must be disjoint.
- `targetResidentId`, TTL, timestamps, confidence enforced at loop boundary.
- Bounded phrase recognition (not substring).
- `speak` is NOT_IMPLEMENTED; no private text echo.
- Expanded executable tests (26 pass).
- `tsc` clean.

## Run

```bash
npm install   # or npm ci once package-lock.json is present
npm test
npm run build
```

## Known limitations

- `package-lock.json` was generated and verified with `npm ci` + full test/build in the builder environment; if missing from this branch tip, re-run `npm install` locally to produce a registry-compatible lockfile.
- No GitHub Actions CI workflow yet.
- No real embodiment/physics/inventory.
- Consent is preflight-only until canonical NEXA Intimacy integration exists.

## Branch discipline

- Base: `main` @ `73d121c929abb071cbc90d6a85d7e1b8208311ca`
- Work branch: `work/nexia-autonomy-donor-hardening-v1`
- Direct writes to main: forbidden
- New repositories: forbidden

Founder and final authority: Anthony D. Smith — Founder AMP
