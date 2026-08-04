import { v4 as uuid } from 'uuid';
import { Mind, Perception, BodyState, InfluenceEvent } from './types';
import { NeedsEngine } from './NeedsEngine';
import { ActionSystem } from './ActionSystem';
import { CognitionLoop, InfluenceIngestionResult } from './CognitionLoop';

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

    this.cognition = new CognitionLoop(
      mind,
      this.needs,
      this.actions,
      initialPerception,
      this.id
    );
  }

  awaken() {
    this.cognition.start();
  }

  sleep() {
    this.cognition.stop();
  }

  influence(event: InfluenceEvent): InfluenceIngestionResult {
    return this.cognition.pushInfluence(event);
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
