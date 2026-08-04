/** Donor-side consent preflight only. This module never authorizes execution. */
export type ConsentStatus =
  | 'CONTRACT_PENDING' | 'ABSENT' | 'EXPIRED' | 'REVOKED'
  | 'PAUSED' | 'STOPPED' | 'SOS' | 'MALFORMED' | 'MISMATCH';

export interface ExternalConsentDecision {
  decisionId: string;
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
  authorityId: string;
  verificationToken: string;
}

export interface ConsentExpectation {
  purpose: string;
  actorId: string;
  targetId: string;
  actionId: string;
}

export interface ConsentValidationResult {
  status: ConsentStatus;
  allowed: false;
  message: string;
}

const nonEmpty = (value: unknown, max = 256) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export function validateExternalConsent(
  decision: ExternalConsentDecision | null | undefined,
  expected: ConsentExpectation,
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
    'decisionId', 'purpose', 'scope', 'actorId', 'targetId', 'actionId', 'authorityId', 'verificationToken',
  ];
  if (requiredStrings.some((field) => !nonEmpty(decision[field]))) {
    return { status: 'MALFORMED', allowed: false, message: 'Consent envelope is missing a required bounded identity or authority field.' };
  }
  if (!Number.isFinite(decision.issuedAt) || !Number.isFinite(decision.expiresAt)
      || decision.expiresAt <= decision.issuedAt || decision.issuedAt > now + 5_000) {
    return { status: 'MALFORMED', allowed: false, message: 'Consent timestamps are invalid.' };
  }
  if (now > decision.expiresAt) return { status: 'EXPIRED', allowed: false, message: 'Consent expired.' };
  if (decision.purpose !== expected.purpose
      || decision.actorId !== expected.actorId
      || decision.targetId !== expected.targetId
      || decision.actionId !== expected.actionId) {
    return { status: 'MISMATCH', allowed: false, message: 'Consent envelope does not bind to the requested actor, target, action, and purpose.' };
  }
  return {
    status: 'CONTRACT_PENDING',
    allowed: false,
    message: 'Envelope preflight passed, but canonical NEXA Intimacy verification is not integrated. Execution blocked.',
  };
}
