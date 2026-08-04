/**
 * Donor-side Consent Boundary (preflight only)
 *
 * THIS DONOR DOES NOT:
 * - issue canonical consent
 * - determine legal or resident capacity
 * - own NEXA Intimacy policy
 * - store public intimacy receipts
 * - replace NEXA Intimacy
 * - ever return a locally VALID authorization for execution
 */

export type ConsentStatus =
  | 'CONTRACT_PENDING'
  | 'ABSENT'
  | 'EXPIRED'
  | 'REVOKED'
  | 'PAUSED'
  | 'STOPPED'
  | 'SOS'
  | 'MALFORMED';

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
  /** Required envelope fields for future canonical adapter */
  actorId?: string;
  targetId?: string;
  actionId?: string;
  authorityId?: string;
  verificationToken?: string;
}

export interface ConsentValidationResult {
  status: ConsentStatus;
  allowed: boolean; // always false in this donor
  message: string;
}

/**
 * Preflight inspection only. Execution is always blocked (CONTRACT_PENDING)
 * until canonical NEXA Intimacy integration exists.
 */
export function validateExternalConsent(
  decision: ExternalConsentDecision | null | undefined,
  requiredPurpose: string
): ConsentValidationResult {
  if (!decision) {
    return {
      status: 'CONTRACT_PENDING',
      allowed: false,
      message: 'No external consent decision. Canonical NEXA Intimacy contract required. Blocked.',
    };
  }

  if (decision.sos) {
    return { status: 'SOS', allowed: false, message: 'SOS active. Immediate stop.' };
  }
  if (decision.stopped) {
    return { status: 'STOPPED', allowed: false, message: 'Consent stopped.' };
  }
  if (decision.paused) {
    return { status: 'PAUSED', allowed: false, message: 'Consent paused.' };
  }
  if (decision.revoked) {
    return { status: 'REVOKED', allowed: false, message: 'Consent revoked.' };
  }
  if (!Number.isFinite(decision.issuedAt) || !Number.isFinite(decision.expiresAt)) {
    return { status: 'MALFORMED', allowed: false, message: 'Invalid issuedAt/expiresAt.' };
  }
  if (decision.expiresAt < decision.issuedAt) {
    return { status: 'MALFORMED', allowed: false, message: 'expiresAt before issuedAt.' };
  }
  if (Date.now() > decision.expiresAt) {
    return { status: 'EXPIRED', allowed: false, message: 'Consent expired.' };
  }
  if (decision.purpose !== requiredPurpose) {
    return {
      status: 'ABSENT',
      allowed: false,
      message: `Purpose mismatch. Required: ${requiredPurpose}`,
    };
  }

  // Envelope may be present for future adapter use, but this donor never authorizes.
  return {
    status: 'CONTRACT_PENDING',
    allowed: false,
    message: 'Preflight only. Canonical NEXA Intimacy integration not present. Execution blocked.',
  };
}
