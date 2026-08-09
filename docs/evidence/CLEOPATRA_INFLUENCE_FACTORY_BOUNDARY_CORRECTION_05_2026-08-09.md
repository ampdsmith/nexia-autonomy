# CLEOPATRA Influence-Factory Boundary Correction 05 Evidence

**Date:** 2026-08-09  
**Continuous work period started:** 2026-08-09 12:27 PM CDT  
**Founder and final authority:** Anthony D. Smith — Founder AMP  
**Executing builder:** CLEOPATRA — Lead Builder  
**Work order:** `NEXIA-AUTONOMY-DONOR-HARDENING-001-CLEOPATRA-TAKEOVER-01`  
**Repository:** `ampdsmith/nexia-autonomy`  
**Branch:** `work/nexia-autonomy-donor-hardening-v1`  
**Predecessor correction-04 evidence head:** `c58ef024ffffae1ff6fb1bffdd19901ce34c56ab`  
**Founder delivery day:** Tuesday, 2026-08-11  
**Visual-proof hard gate:** ACTIVE

## Pre-evidence source identity

```text
CORRECTION-04 EVIDENCE HEAD:
c58ef024ffffae1ff6fb1bffdd19901ce34c56ab

CORRECTION-05 SOURCE HEAD BEFORE THIS RECEIPT:
792bcfe479042588f0e6b9c269a290149dadfa42

RELATION:
4 COMMITS AHEAD / 0 BEHIND

CHANGED FILES:
4
```

## Forward-only correction commits

```text
8836f6c95a7a54886558a25b53f7c308f4429c5e
Align influence factories with cognition ingestion schema

364dc8403ba810dbc97a78ada7ae9f4e96daa8ab
Add influence factory boundary regression coverage

4e13c105e20e7f5d6d8d865aaf765d758687c702
Add influence factory regression to donor test command

792bcfe479042588f0e6b9c269a290149dadfa42
Document influence factory boundary correction 05
```

## Exact changed-path boundary

1. `src/input/InfluenceChannels.ts`
2. `src/tests/influence-factory-boundary.test.ts` — added
3. `package.json`
4. `README.md`

## Builder-found public API defect

The cognition ingestion boundary already rejected malformed mouse/touch payloads, but the public factory helpers could still construct events the runtime would later refuse.

Fresh reproduction at the predecessor source:

```text
mouse_button_99: CREATED
mouse_empty_target: CREATED
touch_duplicate_ids: CREATED
touch_fractional_id: CREATED
touch_empty_gesture: CREATED
```

That split validation behavior is a usability defect: callers using the provided helper API can receive apparently valid `InfluenceEvent` objects that are guaranteed to fail at the next runtime boundary.

## Correction

Mouse factory now validates:

- finite x/y coordinates;
- optional button is an integer in `0-5`;
- optional target object is non-empty and bounded;
- payload contains only supported keys.

Touch factory now validates:

- 1-10 touch points;
- each touch ID is an integer;
- touch IDs are unique;
- x/y coordinates are finite;
- optional gesture and target object are non-empty and bounded;
- payload and individual touch points contain only supported keys.

Both factories construct returned content from validated known fields rather than blindly spreading the caller payload.

## New regression

`src/tests/influence-factory-boundary.test.ts` verifies valid construction plus rejection of:

- out-of-range mouse button;
- empty mouse target;
- unknown mouse field;
- duplicate touch IDs;
- fractional touch ID;
- empty gesture;
- empty touch target;
- unknown touch payload field;
- unknown touch-point field.

## Fresh builder execution evidence

```text
STRICT TYPESCRIPT:
PASS

HARDENING:
76 passed / 0 failed / 0 skipped

REPLAY / CANCEL:
12 passed / 0 failed / 0 skipped

CONSENT REPLAY CAPACITY:
10 passed / 0 failed / 0 skipped

REPLAY AUTHORITY CAPACITY:
8 passed / 0 failed / 0 skipped

INFLUENCE FACTORY BOUNDARY:
11 passed / 0 failed / 0 skipped

TYPESCRIPT BUILD:
PASS
```

Compiled-JavaScript execution:

```text
HARDENING:
76 / 76 PASS

REPLAY / CANCEL:
12 / 12 PASS

CONSENT CAPACITY:
10 / 10 PASS

REPLAY AUTHORITY CAPACITY:
8 / 8 PASS

INFLUENCE FACTORY BOUNDARY:
11 / 11 PASS

COMPILED DEMO:
EXIT 0
processedCount: 1
processedIntentionCount: 1
actionCount: 1
lastBoundaryRejection: null
```

The combined compiled runner reached its outer tool timeout only after all five compiled test suites had completed successfully and while the demo was starting. The compiled demo was therefore rerun separately and returned exit 0 with the counters above. No product failure is hidden by the runner timeout.

## Open limitation preserved

```text
CLEAN NPM CI: NOT PROVEN
COMPLETE REGISTRY-RESOLVED LOCK GRAPH: NOT PROVEN
KNOWN EXECUTION-REGISTRY ISSUE: @types/node@^20.11.0 unavailable in prior clean-install attempts
HAND-AUTHORED TRANSITIVE LOCK ENTRIES: NO
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

This is a builder evidence receipt, not independent acceptance.