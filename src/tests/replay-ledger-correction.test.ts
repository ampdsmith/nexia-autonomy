import { randomUUID } from 'node:crypto';
import { ActionSystem } from '../core/ActionSystem';
import { CognitionLoop } from '../core/CognitionLoop';
import { NeedsEngine } from '../core/NeedsEngine';
import { InMemoryReplayLedger, ReplayLedger } from '../core/ReplayLedger';
import { BodyState, DeliberationResult, Mind, Perception } from '../core/types';
import { createVoiceInfluence } from '../input/InfluenceChannels';
import { DeterministicBaselineMind } from '../minds/DeterministicBaselineMind';

let passed = 0;
let failed = 0;
const failures: string[] = [];
function assert(condition: boolean, name: string) {
  if (condition) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; failures.push(name); console.log(`  FAIL  ${name}`); }
}
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const residentId = 'resident-replay-audit';
const body = (): BodyState => ({ location: 'home', posture: 'standing', clothing: ['basic'], energyLevel: 80, inventory: [] });
const perception = (): Perception => ({ timestamp: Date.now(), location: 'home', nearbyObjects: [], nearbyResidents: [], environmentNotes: [] });
const identity = { targetResidentId: residentId, provenance: 'audit-correction-02', confidence: 0.99 };

class ThrowingReplayLedger implements ReplayLedger {
  claim(): 'ACCEPTED' | 'REPLAY' { throw new Error('ledger unavailable'); }
}

class SequenceMind implements Mind {
  constructor(private readonly ids: string[]) {}
  private cursor = 0;
  async deliberate(_ctx: any, signal: AbortSignal): Promise<DeliberationResult> {
    signal.throwIfAborted();
    if (this.cursor >= this.ids.length) {
      return { intention: null, control: 'NONE', acceptedInfluenceIds: [], rejectedInfluenceIds: [], deferredInfluenceIds: [] };
    }
    const id = this.ids[this.cursor++];
    return {
      intention: { id, action: 'observe', urgency: 0.2, reasoning: 'replay-ledger audit sequence', createdAt: Date.now() },
      control: 'NONE', acceptedInfluenceIds: [], rejectedInfluenceIds: [], deferredInfluenceIds: [],
    };
  }
}

async function run() {
  console.log('=== CLEOPATRA REPLAY LEDGER / CANCEL CORRECTION TESTS ===\n');

  console.log('Influence replay survives local-cache eviction and loop reconstruction');
  const sharedLedger = new InMemoryReplayLedger();
  const firstLoop = new CognitionLoop(
    new DeterministicBaselineMind(), new NeedsEngine(), new ActionSystem(body(), residentId), perception(), residentId,
    25, 100, 100, () => false, sharedLedger,
  );
  const first = createVoiceInfluence('unknown first', identity);
  assert(firstLoop.pushInfluence(first).status === 'ACCEPTED', 'first influence accepted once');
  firstLoop.stop({ clearPending: true });
  let allFillersAccepted = true;
  for (let i = 0; i < 1_005; i++) {
    const event = createVoiceInfluence(`unknown ${i}`, identity);
    allFillersAccepted = allFillersAccepted && firstLoop.pushInfluence(event).status === 'ACCEPTED';
    firstLoop.stop({ clearPending: true });
  }
  assert(allFillersAccepted, '1,005 filler influences accepted to force local-cache eviction');
  const replayAfterEviction = { ...first, timestamp: Date.now(), expiresAt: Date.now() + 5_000, consumed: false };
  assert(firstLoop.pushInfluence(replayAfterEviction).status === 'REJECTED_REPLAY', 'authoritative ledger rejects influence after local cache eviction');

  const reconstructed = new CognitionLoop(
    new DeterministicBaselineMind(), new NeedsEngine(), new ActionSystem(body(), residentId), perception(), residentId,
    25, 100, 100, () => false, sharedLedger,
  );
  assert(reconstructed.pushInfluence(replayAfterEviction).status === 'REJECTED_REPLAY', 'shared injected ledger rejects influence after loop reconstruction');

  console.log('\nReplay ledger unavailability fails closed');
  const noLedger = new CognitionLoop(
    new DeterministicBaselineMind(), new NeedsEngine(), new ActionSystem(body(), residentId), perception(), residentId,
    25, 100, 100, () => false, null,
  );
  assert(noLedger.pushInfluence(createVoiceInfluence('walk', identity)).status === 'REJECTED_REPLAY_LEDGER_UNAVAILABLE', 'missing replay ledger rejects influence');
  const throwingLedger = new CognitionLoop(
    new DeterministicBaselineMind(), new NeedsEngine(), new ActionSystem(body(), residentId), perception(), residentId,
    25, 100, 100, () => false, new ThrowingReplayLedger(),
  );
  assert(throwingLedger.pushInfluence(createVoiceInfluence('walk', identity)).status === 'REJECTED_REPLAY_LEDGER_UNAVAILABLE', 'failing replay ledger rejects influence');

  console.log('\nIntention replay survives local-cache eviction and reconstruction');
  const intentionLedger = new InMemoryReplayLedger();
  const ids = Array.from({ length: 205 }, () => randomUUID());
  const sequenceActions = new ActionSystem(body(), residentId);
  const sequenceLoop = new CognitionLoop(
    new SequenceMind(ids), new NeedsEngine(), sequenceActions, perception(), residentId,
    1, 100, 100, () => false, intentionLedger,
  );
  sequenceLoop.start();
  await wait(10_700);
  sequenceLoop.stop();
  assert(sequenceActions.getActionCount() >= 205, 'more than MAX_INTENTIONS distinct intentions executed before replay test');

  const replayActions = new ActionSystem(body(), residentId);
  const replayMind: Mind = { async deliberate(_ctx, signal) {
    signal.throwIfAborted();
    return { intention: { id: ids[0], action: 'observe', urgency: 0.2, reasoning: 'replay attempt', createdAt: Date.now() }, control: 'NONE', acceptedInfluenceIds: [], rejectedInfluenceIds: [], deferredInfluenceIds: [] };
  }};
  const replayLoop = new CognitionLoop(
    replayMind, new NeedsEngine(), replayActions, perception(), residentId,
    1, 100, 100, () => false, intentionLedger,
  );
  replayLoop.start();
  await wait(90);
  replayLoop.stop();
  assert(replayLoop.getStatus().lastBoundaryRejection === 'INTENTION_REPLAY', 'reconstructed loop rejects old intention ID after local cache eviction');
  assert(replayActions.getActionCount() === 0, 'replayed intention performs no action');

  console.log('\nCancel remains distinct from stop');
  const cancelLedger = new InMemoryReplayLedger();
  const cancelLoop = new CognitionLoop(
    new DeterministicBaselineMind(), new NeedsEngine(), new ActionSystem(body(), residentId), perception(), residentId,
    25, 100, 100, () => true, cancelLedger,
  );
  assert(cancelLoop.pushInfluence(createVoiceInfluence('cancel', identity, 0.9)).status === 'ACCEPTED', 'cancel influence accepted');
  cancelLoop.start();
  await wait(80);
  assert(cancelLoop.getStatus().controlState === 'CANCELLED', 'cancel produces distinct persistent CANCELLED state');
  assert(cancelLoop.start() === false, 'ordinary start cannot bypass CANCELLED state');

  console.log('\n=== RESULTS ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  failures.forEach((failure) => console.log('  -', failure));
  console.log('ledger_claim_count:', sharedLedger.getClaimCount());
  if (failed) process.exit(1);
}

run().catch((error) => { console.error(error); process.exit(1); });
