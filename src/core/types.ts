/**
 * Nexia Autonomy Core Types
 * Strict free-will design. No external choice lists ever reach the mind.
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
  thresholdAware: number; // value at which resident becomes consciously aware
  thresholdCritical: number;
}

export interface NeedsSnapshot {
  timestamp: number;
  needs: Record<NeedType, number>;
  awareSignals: NeedType[];   // needs currently above aware threshold
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
  target?: string;           // object, location, or other resident id
  parameters?: Record<string, unknown>;
  urgency: number;           // 0-1, derived from needs + free deliberation
  reasoning?: string;        // optional internal monologue (for debug / SI transparency)
  createdAt: number;
}

export interface InfluenceEvent {
  id: string;
  channel: 'voice' | 'mouse' | 'touch';
  content: string | object;
  timestamp: number;
  strength: number;          // how strongly the external force is pushing (still optional)
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
  newStateHints?: Partial<Record<NeedType, number>>; // e.g. eating reduces hunger
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
  isIntimateCapable: boolean;
  inventory: string[];
}

/**
 * The Mind interface. Any AI or SI implements this to inhabit a Resident.
 * The Autonomy Core never forces options into the mind.
 */
export interface Mind {
  deliberate(context: CognitionContext): Promise<Intention | null>;
  name?: string;
}
