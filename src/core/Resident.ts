import { randomUUID } from 'node:crypto';
import { Mind, Perception, BodyState, InfluenceEvent } from './types';
import { NeedsEngine } from './NeedsEngine';
import { ActionSystem } from './ActionSystem';
import { CognitionLoop, InfluenceIngestionResult } from './CognitionLoop';

export class Resident {
  readonly id: string;
  readonly name: string;
  private readonly cognition: CognitionLoop;
  private readonly mind: Mind;

  constructor(name: string, mind: Mind, initialLocation = 'home') {
    if (typeof name !== 'string' || !name.trim() || name.length > 200) throw new TypeError('Resident name is required and bounded.');
    if (typeof initialLocation !== 'string' || !initialLocation.trim() || initialLocation.length > 200) throw new TypeError('Initial location is required and bounded.');
    this.id = randomUUID();
    this.name = name.trim();
    this.mind = mind;
    const needs = new NeedsEngine();
    const body: BodyState = { location: initialLocation.trim(), posture: 'standing', clothing: ['basic_outfit'], energyLevel: 80, inventory: [] };
    const actions = new ActionSystem(body, this.id);
    const initialPerception: Perception = {
      timestamp: Date.now(), location: initialLocation.trim(),
      nearbyObjects: ['bed', 'kitchen', 'bathroom', 'chair', 'mirror'], nearbyResidents: [],
      environmentNotes: ['quiet interior space'],
    };
    this.cognition = new CognitionLoop(mind, needs, actions, initialPerception, this.id);
  }

  awaken() { this.cognition.start(); }
  sleep() { this.cognition.stop({ clearPending: true }); }
  influence(event: InfluenceEvent): InfluenceIngestionResult { return this.cognition.pushInfluence(event); }
  updateWorld(perception: Perception) { this.cognition.updatePerception(perception); }
  status() { return { id: this.id, name: this.name, mind: this.mind.name || 'anonymous', ...this.cognition.getStatus() }; }
}
