import { createMouseInfluence, createTouchInfluence } from '../input/InfluenceChannels';

let passed = 0;
let failed = 0;
const failures: string[] = [];
function assert(condition: boolean, name: string) {
  if (condition) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; failures.push(name); console.log(`  FAIL  ${name}`); }
}
function assertThrows(fn: () => unknown, name: string) {
  try { fn(); assert(false, name); }
  catch { assert(true, name); }
}

const identity = { targetResidentId: 'resident-factory-boundary', provenance: 'factory-boundary-test', confidence: 0.99 };

async function run() {
  console.log('=== CLEOPATRA INFLUENCE FACTORY BOUNDARY TESTS ===\n');

  console.log('Mouse factory');
  const mouse = createMouseInfluence({ x: 10, y: 20, button: 0, targetObject: 'door' }, identity);
  assert(mouse.channel === 'mouse', 'valid mouse payload created');
  assertThrows(() => createMouseInfluence({ x: 1, y: 2, button: 99 }, identity), 'out-of-range mouse button rejected by factory');
  assertThrows(() => createMouseInfluence({ x: 1, y: 2, targetObject: '' }, identity), 'empty mouse target rejected by factory');
  assertThrows(() => createMouseInfluence({ x: 1, y: 2, execute: true } as any, identity), 'unknown mouse field rejected by factory');

  console.log('\nTouch factory');
  const touch = createTouchInfluence({ touches: [{ id: 1, x: 10, y: 20 }], gesture: 'tap', targetObject: 'panel' }, identity);
  assert(touch.channel === 'touch', 'valid touch payload created');
  assertThrows(() => createTouchInfluence({ touches: [{ id: 1, x: 1, y: 2 }, { id: 1, x: 3, y: 4 }] }, identity), 'duplicate touch ids rejected by factory');
  assertThrows(() => createTouchInfluence({ touches: [{ id: 1.5, x: 1, y: 2 }] }, identity), 'fractional touch id rejected by factory');
  assertThrows(() => createTouchInfluence({ touches: [{ id: 1, x: 1, y: 2 }], gesture: '' }, identity), 'empty gesture rejected by factory');
  assertThrows(() => createTouchInfluence({ touches: [{ id: 1, x: 1, y: 2 }], targetObject: '' }, identity), 'empty touch target rejected by factory');
  assertThrows(() => createTouchInfluence({ touches: [{ id: 1, x: 1, y: 2 }], execute: true } as any, identity), 'unknown touch field rejected by factory');
  assertThrows(() => createTouchInfluence({ touches: [{ id: 1, x: 1, y: 2, pressure: 1 } as any] }, identity), 'unknown touch-point field rejected by factory');

  console.log('\n=== RESULTS ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  failures.forEach((failure) => console.log('  -', failure));
  if (failed) process.exit(1);
}

run().catch((error) => { console.error(error); process.exit(1); });
