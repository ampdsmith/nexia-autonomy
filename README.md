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

This repository is **not**:
- NEXIA
- a game or game engine
- a separate autonomy platform
- a canonical consent or identity system
- a production deployment

It is a polished donor prototype that preserves useful architectural ideas while correcting earlier unsafe and overstated behavior.

---

## What this donor provides

- **NeedsEngine** — continuous internal need simulation (hunger, thirst, bladder, energy, hygiene, social, intimacy, etc.). The resident can become aware of its own rising needs.
- **Open-ended Mind adapter** — any AI or SI can implement the `Mind` interface and produce intentions. This enables autonomous decision policy. It does not prove free will.
- **CognitionLoop** — continuous perceive → deliberate → act cycle. No forced choice menus are ever injected.
- **Influence channels only** — voice, mouse, and touch produce expiring, single-use influence events. The Mind may accept or ignore them. Keyboard locomotion does not exist.
- **Donor-side fail-closed consent boundary** — all social and intimate actions require a verified external consent decision from the canonical NEXA Intimacy system. Until that integration exists, every such action returns `CONTRACT_PENDING` and is blocked. This donor does not issue consent, does not determine capacity, and does not own intimacy policy.

---

## Hardening applied (work/nexia-autonomy-donor-hardening-v1)

1. **Unsafe consent paths removed**  
   Hug, touch, kiss, grab, and intimate no longer succeed from need scores or a local capability flag. They are fail-closed.

2. **Influence lifecycle**  
   Events now carry `expiresAt` and `consumed`. Expired or consumed events are never re-presented to the Mind.

3. **Truthful action states**  
   Stubs are explicitly labeled. Partial completion is reported where the implementation is incomplete.

4. **Executable tests**  
   Real automated tests (not skeletons) covering consent fail-closed behavior, influence expiration, and absence of need-triggered intimacy.

5. **Truthful documentation**  
   All free-will, citizenship, and production claims have been removed or corrected.

---

## Running the tests

```bash
npm install
npm test
```

The test runner prints an evidence block with pass/fail counts.

---

## Scope boundaries (strict)

This donor **may**:
- harden the autonomy framework
- define open-ended Mind adapter boundaries
- control influence-event lifecycle
- define action-state contracts
- provide privacy-safe observability contracts
- perform donor-side fail-closed consent validation
- supply executable tests and truthful documentation

This donor **may not**:
- implement the canonical NEXA Intimacy consent authority
- approve resident citizenship
- make legal or personhood determinations
- provide NEXIA world infrastructure
- create a second identity or continuity system
- define canonical NEXA navigation or application architecture
- perform production deployment

Advanced design targets (Autonomy Observatory, Consent Laboratory, Mind Adapter Showcase, Continuity Vault, Explainable Autonomy) remain design targets only. They are not authorized for full implementation under this hardening checkpoint.

---

## Branch discipline

- Base: `main` @ `73d121c929abb071cbc90d6a85d7e1b8208311ca`
- Work branch: `work/nexia-autonomy-donor-hardening-v1`
- Direct writes to `main`: forbidden
- New repositories: forbidden

Founder and final authority: Anthony D. Smith — Founder AMP
