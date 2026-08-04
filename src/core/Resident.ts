import { v4 as uuid } from 'uuid';
import { Mind, Perception, BodyState, InfluenceEvent } from './types';
import { NeedsEngine } from './NeedsEngine';
import { ActionSystem } from './ActionSystem';
import { CognitionLoop } from './CognitionLoop';

/**
 * Resident
 * A Nexia World citizen body + autonomy core.
 * Attach any Mind (AI or SI) to give it free will under the rules.
 */
export class Resident {
  readonly id: string;
  readonly name: string;
  private needs: NeedsEngine;
  private actions: ActionSystem;
  private cognition: CognitionLoop;
  private mind: Mind;

  constructor(name: string, mind: Mind, initialLocation = 'home') {
    this.id = uuid();
    this.name = name;
    this.mind = mind;

    this.needs = new NeedsEngine();

    const body: BodyState = {
      location: initialLocation,
      posture: 'standing',
      clothing: ['basic_outfit'],
      energyLevel: 80,
      isIntimateCapable: true,
      inventory: [],
    };
    this.actions = new ActionSystem(body);

    const initialPerception: Perception = {
      timestamp: Date.now(),
      location: initialLocation,
      nearbyObjects: ['bed', 'kitchen', 'bathroom', 'chair', 'mirror'],
      nearbyResidents: [],
      environmentNotes: ['quiet interior space'],
    };

    this.cognition = new CognitionLoop(mind, this.needs, this.actions, initialPerception);
  }

  /** Start living autonomously */
  awaken() {
    this.cognition.start();
    console.log(`[Resident ${this.name}] Awakened. Free will online.`);
  }

  sleep() {
    this.cognition.stop();
    console.log(`[Resident ${this.name}] Cognition paused.`);
  }

  /** Influence only — never force */
  influence(event: InfluenceEvent) {
    this.cognition.pushInfluence(event);
  }

  /** World systems update what the resident can perceive */
  updateWorld(perception: Perception) {
    this.cognition.updatePerception(perception);
  }

  status() {
    return {
      id: this.id,
      name: this.name,
      mind: this.mind.name || 'anonymous',
      ...this.cognition.getStatus(),
    };
  }
}
