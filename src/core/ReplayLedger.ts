/**
 * Donor-side replay authority boundary.
 *
 * InMemoryReplayLedger retains claimed identities for the lifetime of the
 * ledger instance and deliberately does not evict them. Reusing the same
 * injected ledger across reconstructed CognitionLoop instances preserves
 * one-time identity semantics for that donor process. This is not production
 * persistence and must not be described as surviving process or host loss.
 */
export type ReplayIdentityKind = 'influence' | 'intention';
export type ReplayClaimResult = 'ACCEPTED' | 'REPLAY';

export interface ReplayLedger {
  claim(kind: ReplayIdentityKind, subjectId: string, identityId: string): ReplayClaimResult;
}

function boundedIdentity(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 200) {
    throw new TypeError(`${field} must be a non-empty bounded string.`);
  }
  return value;
}

export class InMemoryReplayLedger implements ReplayLedger {
  private readonly claims = new Set<string>();

  constructor(private readonly maxClaims = 100_000) {
    if (!Number.isInteger(maxClaims) || maxClaims < 1) throw new RangeError('maxClaims must be a positive integer.');
  }

  claim(kind: ReplayIdentityKind, subjectId: string, identityId: string): ReplayClaimResult {
    const subject = boundedIdentity(subjectId, 'subjectId');
    const identity = boundedIdentity(identityId, 'identityId');
    const key = `${kind}\u0000${subject}\u0000${identity}`;
    if (this.claims.has(key)) return 'REPLAY';
    if (this.claims.size >= this.maxClaims) throw new Error('REPLAY_LEDGER_CAPACITY_EXHAUSTED');
    this.claims.add(key);
    return 'ACCEPTED';
  }

  getClaimCount(): number { return this.claims.size; }
  getCapacity(): number { return this.maxClaims; }
}

/**
 * Non-production process-lifetime default. Callers that reconstruct a loop in
 * the same process receive replay continuity by default. Production adapters
 * must inject their own separately governed durable implementation.
 *
 * Capacity is bounded without eviction. Once exhausted, new identity claims
 * fail closed through the existing CognitionLoop unavailable-ledger boundary;
 * previously recorded identities remain replay-protected.
 */
export const DEFAULT_DONOR_REPLAY_LEDGER = new InMemoryReplayLedger();
