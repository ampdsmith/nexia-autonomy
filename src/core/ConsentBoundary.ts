/** Donor-side consent preflight only. This module never authorizes execution. */
export type ConsentStatus =
  | 'CONTRACT_PENDING' | 'ABSENT' | 'EXPIRED' | 'REVOKED'
  | 'PAUSED' | 'STOPPED' | 'SOS' | 'MALFORMED' | 'MISMATCH' | 'REPLAY'
  | 'REPLAY_LEDGER_FULL';

export interface ExternalConsentDecision {
  decisionId: string;
  oneTimeUseReference: string;
  purpose: string;
  scope: string;
  issuedAt: number;
  expiresAt: number;
  revoked: boolean;
  paused: boolean;
  stopped: boolean;
  sos: boolean;
  actorId: string;
  targetId: string;
  actionId: string;
  intentionId: string;
  authorityId: string;
  verificationReference: string;
}

export interface ConsentExpectation {
  purpose: string;
  scope: string;
  actorId: string;
  targetId: string;
  actionId: string;
  intentionId: string;
  expectedAuthorityId: string;
}

export interface ConsentValidationResult {
  status: ConsentStatus;
  allowed: false;
  message: string;
}

const nonEmpty = (value: unknown, max = 256) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export class ConsentReplayLedger {
  private readonly decisionIds = new Set<string>();
  private readonly oneTimeReferences = new Set<string>();

  constructor(private readonly maxEntries = 500) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new RangeError('maxEntries must be a positive integer.');
  }

  has(decisionId: string, oneTimeUseReference: string): boolean {
    return this.decisionIds.has(decisionId) || this.oneTimeReferences.has(oneTimeUseReference);
  }

  record(decisionId: string, oneTimeUseReference: string): boolean {
    if (this.decisionIds.size >= this.maxEntries || this.oneTimeReferences.size >= this.maxEntries) return false;
    this.decisionIds.add(decisionId);
    this.oneTimeReferences.add(oneTimeUseReference);
    return true;
  }

  getEntryCount(): number { return this.decisionIds.size; }
  getCapacity(): number { return this.maxEntries; }
}

export function validateExternalConsent(
  decision: ExternalConsentDecision | null | undefined,
  expected: ConsentExpectation,
  replayLedger: ConsentReplayLedger,
  now: number = Date.now(),
): ConsentValidationResult {
  if (!decision) {
    return { status: 'CONTRACT_PENDING', allowed: false, message: 'Canonical NEXA Intimacy consent contract is absent. Execution blocked.' };
  }
  if (decision.sos) return { status: 'SOS', allowed: false, message: 'SOS active. Immediate stop.' };
  if (decision.stopped) return { status: 'STOPPED', allowed: false, message: 'Consent stopped.' };
  if (decision.paused) return { status: 'PAUSED', allowed: false, message: 'Consent paused.' };
  if (decision.revoked) return { status: 'REVOKED', allowed: false, message: 'Consent revoked.' };

  const requiredStrings: Array<keyof ExternalConsentDecision> = [
    'decisionId', 'oneTimeUseReference', 'purpose', 'scope', 'actorId', 'targetId',
    'actionId', 'intentionId', 'authorityId', 'verificationReference',
  ];
  if (requiredStrings.some((field) => !nonEmpty(decision[field]))) {
    return { status: 'MALFORMED', allowed: false, message: 'Consent envelope is missing a required bounded identity, scope, authority, or opaque reference field.' };
  }
  if (!Number.isFinite(decision.issuedAt) || !Number.isFinite(decision.expiresAt)
      || decision.expiresAt <= decision.issuedAt || decision.issuedAt > now + 5_000) {
    return { status: 'MALFORMED', allowed: false, message: 'Consent timestamps are invalid.' };
  }
  if (now > decision.expiresAt) return { status: 'EXPIRED', allowed: false, message: 'Consent expired.' };
  if (decision.purpose !== expected.purpose
      || decision.scope !== expected.scope
      || decision.actorId !== expected.actorId
      || decision.targetId !== expected.targetId
      || decision.actionId !== expected.actionId
      || decision.intentionId !== expected.intentionId
      || decision.authorityId !== expected.expectedAuthorityId) {
    return { status: 'MISMATCH', allowed: false, message: 'Consent envelope does not bind to the exact purpose, scope, actor, target, action, intention instance, and expected canonical authority.' };
  }
  if (replayLedger.has(decision.decisionId, decision.oneTimeUseReference)) {
    return { status: 'REPLAY', allowed: false, message: 'Consent decision or one-time-use reference has already been presented.' };
  }
  if (!replayLedger.record(decision.decisionId, decision.oneTimeUseReference)) {
    return { status: 'REPLAY_LEDGER_FULL', allowed: false, message: 'Consent replay ledger capacity is exhausted. One-time-use verification cannot be extended safely; execution remains blocked.' };
  }
  return {
    status: 'CONTRACT_PENDING',
    allowed: false,
    message: 'Exact-instance preflight passed, but canonical NEXA Intimacy verification is not integrated. Execution blocked.',
  };
}