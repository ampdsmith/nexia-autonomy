/**
 * Donor-side Consent Boundary
 *
 * This module implements ONLY the donor-side responsibility:
 * - require a verified external consent decision
 * - validate purpose, scope, expiration, and revocation status
 * - fail closed when the canonical contract is absent
 * - stop immediately on pause, stop, SOS, expiration, or revocation
 * - return CONTRACT_PENDING until the canonical integration exists
 *
 * THIS DONOR DOES NOT:
 * - issue canonical consent
 * - determine legal or resident capacity
 * - own NEXA Intimacy policy
 * - store public intimacy receipts
 * - replace NEXA Intimacy
 */

export type ConsentStatus =
  | 'CONTRACT_PENDING'      // canonical system not yet integrated
  | 'ABSENT'                // no consent decision provided
  | 'EXPIRED'
  | 'REVOKED'
  | 'PAUSED'
  | 'STOPPED'
  | 'SOS'
  | 'VALID';                 // only after external verified decision is present and current

export interface ExternalConsentDecision {
  /** Opaque reference to a decision made by the canonical consent authority */
  decisionId: string;
  purpose: string;
  scope: string;
  issuedAt: number;
  expiresAt: number;
  revoked: boolean;
  paused: boolean;
  stopped: boolean;
  sos: boolean;
  /** Signature or verification token from the canonical system (opaque to this donor) */
  verificationToken?: string;
}

export interface ConsentValidationResult {
  status: ConsentStatus;
  allowed: boolean;
  message: string;
}

/**
 * Validate an external consent decision for a social or intimate action.
 * Fail-closed by design.
 */
export function validateExternalConsent(
  decision: ExternalConsentDecision | null | undefined,
  requiredPurpose: string
): ConsentValidationResult {
  // Canonical integration does not yet exist in this donor.
  // Until it does, every interpersonal action must return CONTRACT_PENDING.
  if (!decision) {
    return {
      status: 'CONTRACT_PENDING',
      allowed: false,
      message: 'No external consent decision provided. Canonical NEXA Intimacy contract required. Action blocked (fail-closed).',
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
  if (Date.now() > decision.expiresAt) {
    return { status: 'EXPIRED', allowed: false, message: 'Consent expired.' };
  }
  if (decision.purpose !== requiredPurpose) {
    return {
      status: 'ABSENT',
      allowed: false,
      message: `Purpose mismatch. Required: ${requiredPurpose}, provided: ${decision.purpose}`,
    };
  }

  // Even with a structurally valid decision object, this donor still treats
  // the action as CONTRACT_PENDING until the real canonical integration is present.
  // This prevents the donor from becoming a parallel consent authority.
  return {
    status: 'CONTRACT_PENDING',
    allowed: false,
    message: 'External decision object present but canonical NEXA Intimacy integration is not yet available. Action blocked (fail-closed).',
  };
}
