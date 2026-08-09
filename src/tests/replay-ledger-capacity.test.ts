import { ActionSystem } from '../core/ActionSystem';
import { CognitionLoop } from '../core/CognitionLoop';
import { NeedsEngine } from '../core/NeedsEngine';
import { InMemoryReplayLedger } from '../core/ReplayLedger';
import { BodyState, Perception } from '../core/types';
import { createVoiceInfluence } from '../input/InfluenceChannels';
import { DeterministicBaselineMind } from '../minds/DeterministicBaselineMind';

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

const residentId = 'resident-replay-capacity';
const body = (): BodyState => ({ location: 'home', posture: 'standing', clothing: ['basic'], energyLevel: 80, inventory: [] });
const perception = (): Perception => ({ timestamp: Date.now(), location: 'home', nearbyObjects: [], nearbyResidents: [], environmentNotes: [] });
const identity = { targetResidentId: residentId, provenance: 'replay-capacity-test', confidence: 0.99 };

async function run() {
  console.log('=== CLEOPATRA REPLAY AUTHORITY CAPACITY TESTS ===\n');

  console.log('Authority remains bounded without evicting old replay evidence');
  const directLedger = new InMemoryReplayLedger(2);
  assert(directLedger.claim('influence', residentId, 'id-1') === 'ACCEPTED', 'first identity accepted');
  assert(directLedger.claim('intention', residentId, 'id-2') === 'ACCEPTED', 'second identity accepted');
  assertThrows(() => directLedger.claim('influence', residentId, 'id-3'), 'new identity fails closed at replay-ledger capacity');
  assert(directLedger.claim('influence', residentId, 'id-1') === 'REPLAY', 'old identity remains replay-blocked after capacity is reached');
  assert(directLedger.getClaimCount() === 2 && directLedger.getCapacity() === 2, 'ledger remains exactly bounded without eviction');

  console.log('\nCognition ingestion converts capacity exhaustion into fail-closed rejection');
  const loopLedger = new InMemoryReplayLedger(1);
  const loop = new CognitionLoop(
    new DeterministicBaselineMind(), new NeedsEngine(), new ActionSystem(body(), residentId), perception(), residentId,
    25, 100, 100, () => false, loopLedger,
  );
  const first = createVoiceInfluence('unknown first', identity);
  const second = createVoiceInfluence('unknown second', identity);
  assert(loop.pushInfluence(first).status === 'ACCEPTED', 'first bounded influence claims replay authority');
  loop.stop({ clearPending: true });
  assert(loop.pushInfluence(second).status === 'REJECTED_REPLAY_LEDGER_UNAVAILABLE', 'new influence fails closed when replay authority capacity is exhausted');
  const replay = { ...first, timestamp: Date.now(), expiresAt: Date.now() + 5_000, consumed: false };
  assert(loop.pushInfluence(replay).status === 'REJECTED_REPLAY', 'old influence remains replay-blocked after capacity exhaustion');

  console.log('\n=== RESULTS ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  failures.forEach((failure) => console.log('  -', failure));
  if (failed) process.exit(1);
}

run().catch((error) => { console.error(error); process.exit(1); });
