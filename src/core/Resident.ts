import { v4 as uuid } from 'uuid';
import { Mind, Perception, BodyState, InfluenceEvent } from './types';
import { NeedsEngine } from './NeedsEngine';
import { ActionSystem } from './ActionSystem';
import { CognitionLoop } from './CognitionLoop';

/**
 * Resident (correction cycle)
 * Host for an open-ended Mind adapter.
 * Does not prove free will, consciousness, or personhood.
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

  awaken() {
    this.cognition.start();
    console.log(`[Resident ${this.name}] Cognition loop started.`);
  }

  sleep() {
    this.cognition.stop();
    console.log(`[Resident ${this.name}] Cognition stopped. No further actions will start.`);
  }

  influence(event: InfluenceEvent) {
    this.cognition.pushInfluence(event);
  }

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
