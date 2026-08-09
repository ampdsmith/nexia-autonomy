import { randomUUID } from 'node:crypto';
import { ActionSystem } from '../core/ActionSystem';
import { CognitionLoop } from '../core/CognitionLoop';
import { NeedsEngine } from '../core/NeedsEngine';
import { BodyState, CognitionContext, DeliberationResult, Mind, Perception } from '../core/types';

let passed = 0;
let failed = 0;
const failures: string[] = [];
function assert(condition: boolean, name: string) {
  if (condition) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; failures.push(name); console.log(`  FAIL  ${name}`); }
}
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const residentId = 'resident-location-coherence';
const body = (): BodyState => ({ location: 'home', posture: 'standing', clothing: ['basic'], energyLevel: 80, inventory: [] });
const perception = (): Perception => ({ timestamp: Date.now(), location: 'home', nearbyObjects: ['kitchen'], nearbyResidents: [], environmentNotes: [] });

class WalkThenInspectMind implements Mind {
  private call = 0;
  observedBodyLocation: string | null = null;
  observedPerceptionLocation: string | null = null;

  async deliberate(ctx: Readonly<CognitionContext>, signal: AbortSignal): Promise<DeliberationResult> {
    signal.throwIfAborted();
    this.call += 1;
    if (this.call === 1) {
      return {
        intention: {
          id: randomUUID(),
          action: 'walk',
          urgency: 0.5,
          reasoning: 'location coherence first-cycle walk',
          parameters: { destination: 'kitchen' },
          createdAt: Date.now(),
        },
        control: 'NONE',
        acceptedInfluenceIds: [],
        rejectedInfluenceIds: [],
        deferredInfluenceIds: [],
      };
    }
    if (this.call === 2) {
      this.observedBodyLocation = ctx.bodyState.location;
      this.observedPerceptionLocation = ctx.perception.location;
    }
    return {
      intention: null,
      control: 'NONE',
      acceptedInfluenceIds: [],
      rejectedInfluenceIds: [],
      deferredInfluenceIds: [],
    };
  }
}

async function run() {
  console.log('=== CLEOPATRA POST-ACTION LOCATION COHERENCE TESTS ===\n');

  const mind = new WalkThenInspectMind();
  const actions = new ActionSystem(body(), residentId);
  const loop = new CognitionLoop(mind, new NeedsEngine(), actions, perception(), residentId, 25, 100, 100);

  assert(loop.start() === true, 'loop starts for coherence regression');
  await wait(150);
  loop.stop();

  assert(actions.getBody().location === 'kitchen', 'first cycle completes bounded walk to kitchen');
  assert(mind.observedBodyLocation === 'kitchen', 'second cognition cycle observes updated body location');
  assert(mind.observedPerceptionLocation === 'kitchen', 'second cognition cycle observes synchronized perception location');
  assert(mind.observedBodyLocation === mind.observedPerceptionLocation, 'body and perception location remain coherent after completed walk');

  console.log('\n=== RESULTS ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  failures.forEach((failure) => console.log('  -', failure));
  if (failed) process.exit(1);
}

run().catch((error) => { console.error(error); process.exit(1); });
