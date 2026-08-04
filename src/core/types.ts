/**
 * Nexia Autonomy Core Types (hardening correction cycle)
 *
 * Quarantined autonomy-framework donor for possible future use inside NEXIA.
 * OPEN-ENDED DELIBERATION ADAPTER: YES
 * AUTONOMOUS DECISION POLICY: POSSIBLE
 * FREE WILL PROVEN: NO
 * CONSCIOUSNESS PROVEN: NO
 * PERSONHOOD PROVEN: NO
 */

export type NeedType =
  | 'hunger'
  | 'thirst'
  | 'bladder'
  | 'energy'
  | 'hygiene'
  | 'social'
  | 'intimacy'
  | 'comfort'
  | 'safety'
  | 'curiosity'
  | 'purpose';

export interface NeedState {
  type: NeedType;
  value: number;
  decayRate: number;
  thresholdAware: number;
  thresholdCritical: number;
}

export interface NeedsSnapshot {
  timestamp: number;
  needs: Record<NeedType, number>;
  awareSignals: NeedType[];
  criticalSignals: NeedType[];
}

export type ActionId =
  | 'walk' | 'run' | 'hop' | 'jump' | 'skip' | 'fall' | 'getUp'
  | 'dress' | 'undress' | 'bathe' | 'brushTeeth' | 'combHair'
  | 'cook' | 'eat' | 'drink' | 'useRestroom' | 'nap' | 'work'
  | 'hug' | 'touch' | 'kiss' | 'grab' | 'intimate'
  | 'idle' | 'observe' | 'speak';

/** Explicit action lifecycle. Implementation maturity is not encoded as success. */
export type ActionLifecycle =
  | 'REQUESTED'
  | 'VALIDATED'
  | 'STARTED'
  | 'INTERRUPTED'
  | 'PARTIALLY_COMPLETED'
  | 'COMPLETED'
  | 'FAILED'
  | 'NOT_IMPLEMENTED';

export interface Intention {
  id: string;
  action: ActionId;
  target?: string;
  parameters?: Record<string, unknown>;
  urgency: number;
  reasoning?: string; // must never contain raw private transcripts
  createdAt: number;
}

/**
 * Mind returns this envelope so the loop can consume only explicitly handled influences.
 */
export interface DeliberationResult {
  intention: Intention | null;
  acceptedInfluenceIds: string[];
  rejectedInfluenceIds: string[];
  deferredInfluenceIds: string[];
}

export interface InfluenceEvent {
  id: string;
  channel: 'voice' | 'mouse' | 'touch';
  content: string | object;
  timestamp: number;
  strength: number;          // 0-1
  expiresAt: number;
  consumed: boolean;
  speakerId?: string;
  targetResidentId?: string; // optional resident target
  provenance?: string;       // source system / session id
  confidence?: number;       // 0-1 recognition confidence when available
}

export interface Perception {
  timestamp: number;
  location: string;
  nearbyObjects: string[];
  nearbyResidents: string[];
  environmentNotes: string[];
}

export interface ActionResult {
  intentionId: string;
  lifecycle: ActionLifecycle;
  success: boolean;
  partial: boolean;
  message: string;
  newStateHints?: Partial<Record<NeedType, number>>;
}

export interface CognitionContext {
  needs: NeedsSnapshot;
  perception: Perception;
  recentInfluences: InfluenceEvent[]; // only non-expired, non-consumed, non-processed
  recentActions: ActionResult[];
  bodyState: BodyState;
  personalityHints?: string;
}

export interface BodyState {
  location: string;
  posture: 'standing' | 'sitting' | 'lying' | 'falling' | 'kneeling';
  clothing: string[];
  energyLevel: number;
  inventory: string[];
}

/**
 * Mind interface.
 * Implementing this does not prove free will, consciousness, or personhood.
 */
export interface Mind {
  deliberate(context: CognitionContext): Promise<DeliberationResult>;
  name?: string;
}

/** Bounded TTL validation constants (ms) */
export const INFLUENCE_TTL_MIN_MS = 500;
export const INFLUENCE_TTL_MAX_MS = 120_000;
export const INFLUENCE_TTL_DEFAULT_MS = 30_000;
