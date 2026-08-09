/**
 * Quarantined autonomy-framework donor types.
 * This source does not prove free will, consciousness, personhood, or canonical NEXA/NEXIA authority.
 */

export type NeedType =
  | 'hunger' | 'thirst' | 'bladder' | 'energy' | 'hygiene'
  | 'social' | 'intimacy' | 'comfort' | 'safety' | 'curiosity' | 'purpose';

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

export const ACTION_IDS = [
  'walk', 'run', 'hop', 'jump', 'skip', 'fall', 'getUp',
  'dress', 'undress', 'bathe', 'brushTeeth', 'combHair',
  'cook', 'eat', 'drink', 'useRestroom', 'nap', 'work',
  'hug', 'touch', 'kiss', 'grab', 'intimate',
  'idle', 'observe', 'speak',
] as const;

export type ActionId = typeof ACTION_IDS[number];
export type CognitionControl = 'NONE' | 'PAUSE' | 'STOP' | 'CANCEL';
export type CognitionControlState = 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'CANCELLED';

export type ActionLifecycle =
  | 'REQUESTED' | 'VALIDATED' | 'STARTED' | 'INTERRUPTED'
  | 'PARTIALLY_COMPLETED' | 'COMPLETED' | 'FAILED' | 'NOT_IMPLEMENTED';

export interface Intention {
  id: string;
  action: ActionId;
  target?: string;
  parameters?: Record<string, unknown>;
  urgency: number;
  reasoning?: string;
  createdAt: number;
}

export interface DeliberationResult {
  intention: Intention | null;
  acceptedInfluenceIds: string[];
  rejectedInfluenceIds: string[];
  deferredInfluenceIds: string[];
  control?: CognitionControl;
}

export interface InfluenceEvent {
  id: string;
  channel: 'voice' | 'mouse' | 'touch';
  content: string | object;
  timestamp: number;
  strength: number;
  expiresAt: number;
  consumed: boolean;
  speakerId?: string;
  targetResidentId: string;
  provenance: string;
  confidence?: number;
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
  recentInfluences: InfluenceEvent[];
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

export interface Mind {
  deliberate(context: Readonly<CognitionContext>, signal: AbortSignal): Promise<DeliberationResult>;
  name?: string;
}

export const INFLUENCE_TTL_MIN_MS = 500;
export const INFLUENCE_TTL_MAX_MS = 120_000;
export const INFLUENCE_TTL_DEFAULT_MS = 30_000;
export const INFLUENCE_FUTURE_SKEW_MAX_MS = 5_000;
export const INFLUENCE_CONTENT_MAX_BYTES = 4_096;
export const INFLUENCE_PROVENANCE_MAX_LENGTH = 200;
export const INTENTION_MAX_AGE_MS = 120_000;
export const INTENTION_FUTURE_SKEW_MAX_MS = 5_000;
export const INTENTION_REASONING_MAX_LENGTH = 512;
export const INTENTION_PARAMETERS_MAX_BYTES = 8_192;
