import { ActionSystem } from '../core/ActionSystem';
import { BodyState, Intention } from '../core/types';

let passed = 0;
let failed = 0;
const failures: string[] = [];
function assert(condition: boolean, name: string) {
  if (condition) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; failures.push(name); console.log(`  FAIL  ${name}`); }
}

const body = (): BodyState => ({ location: 'home', posture: 'standing', clothing: ['basic'], energyLevel: 80, inventory: [] });
const intention = (destination: unknown): Intention => ({
  id: `walk-${String(destination)}`,
  action: 'walk',
  urgency: 0.5,
  reasoning: 'bounded donor walk usability test',
  parameters: { destination },
  createdAt: Date.now(),
});

async function run() {
  console.log('=== CLEOPATRA BOUNDED WALK USABILITY TESTS ===\n');

  const initial = body();
  const actions = new ActionSystem(initial, 'resident-walk-usability');
  const completed = await actions.execute(intention('kitchen'));
  assert(completed.success === true, 'bounded walk succeeds');
  assert(completed.lifecycle === 'COMPLETED', 'bounded walk reports COMPLETED lifecycle');
  assert(actions.getBody().location === 'kitchen', 'bounded walk mutates donor body location');
  assert(initial.location === 'home', 'ActionSystem does not mutate caller-owned initial body object');

  const beforeInvalid = actions.getBody().location;
  const missing = await actions.execute(intention(undefined));
  assert(missing.success === false && missing.lifecycle === 'FAILED', 'missing destination fails closed');
  assert(actions.getBody().location === beforeInvalid, 'missing destination performs zero location mutation');

  const blank = await actions.execute(intention('   '));
  assert(blank.success === false, 'blank destination fails closed');
  assert(actions.getBody().location === beforeInvalid, 'blank destination performs zero location mutation');

  const oversized = await actions.execute(intention('x'.repeat(201)));
  assert(oversized.success === false, 'oversized destination fails closed');
  assert(actions.getBody().location === beforeInvalid, 'oversized destination performs zero location mutation');

  const controller = new AbortController();
  controller.abort(new Error('test abort'));
  let aborted = false;
  try { await actions.execute(intention('bathroom'), controller.signal); }
  catch { aborted = true; }
  assert(aborted, 'pre-aborted walk is rejected before mutation');
  assert(actions.getBody().location === beforeInvalid, 'pre-aborted walk performs zero location mutation');

  console.log('\n=== RESULTS ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  failures.forEach((failure) => console.log('  -', failure));
  if (failed) process.exit(1);
}

run().catch((error) => { console.error(error); process.exit(1); });
