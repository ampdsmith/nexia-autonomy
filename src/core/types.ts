/**
 * Nexia Autonomy Core Types (hardened donor version)
 *
 * This is a quarantined autonomy-framework donor for possible future use inside NEXIA.
 * It is not NEXIA, not a game, not a game engine, and not a separate autonomy platform.
 *
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
  value: number;       // 0 = fully satisfied, 100 = critical need
  decayRate: number;   // units per second
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

export interface Intention {
  id: string;
  action: ActionId;
  target?: string;
  parameters?: Record<string, unknown>;
  urgency: number;
  reasoning?: string;        // optional, for transparency / debug only
  createdAt: number;
}

export interface InfluenceEvent {
  id: string;
  channel: 'voice' | 'mouse' | 'touch';
  content: string | object;
  timestamp: number;
  strength: number;          // 0-1
  expiresAt: number;         // hard expiration
  consumed: boolean;         // once true, must not be re-presented
  speakerId?: string;        // optional identity when available
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
  success: boolean;
  partial: boolean;
  message: string;
  newStateHints?: Partial<Record<NeedType, number>>;
}

export interface CognitionContext {
  needs: NeedsSnapshot;
  perception: Perception;
  recentInfluences: InfluenceEvent[];  // only non-expired, non-consumed
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
  // isIntimateCapable removed as an authorization signal.
  // Capability is never sufficient for interpersonal action.
}

/**
 * The Mind interface.
 * Any AI or SI can implement this to inhabit a Resident.
 * The Autonomy Core never forces options into the mind.
 * Implementing this interface does not prove free will, consciousness, or personhood.
 */
export interface Mind {
  deliberate(context: CognitionContext): Promise<Intention | null>;
  name?: string;
}
