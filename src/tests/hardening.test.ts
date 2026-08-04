import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ConsentReplayLedger, validateExternalConsent, ExternalConsentDecision } from '../core/ConsentBoundary';
import { ActionSystem } from '../core/ActionSystem';
import { CognitionLoop } from '../core/CognitionLoop';
import { NeedsEngine } from '../core/NeedsEngine';
import { DeterministicBaselineMind } from '../minds/DeterministicBaselineMind';
import { createMouseInfluence, createTouchInfluence, createVoiceInfluence } from '../input/InfluenceChannels';
import { ActionResult, BodyState, Perception, Mind, CognitionContext, DeliberationResult, Intention } from '../core/types';

let passed = 0;
let failed = 0;
const failures: string[] = [];
function assert(condition: boolean, name: string) {
  if (condition) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL  ${name}`); }
}
async function assertRejects(fn: () => unknown | Promise<unknown>, name: string) {
  try { await fn(); assert(false, name); } catch { assert(true, name); }
}
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const body = (): BodyState => ({ location: 'home', posture: 'standing', clothing: ['basic'], energyLevel: 80, inventory: [] });
const perception = (): Perception => ({ timestamp: Date.now(), location: 'home', nearbyObjects: ['kitchen', 'bathroom'], nearbyResidents: [], environmentNotes: [] });
const residentId = 'resident-test-1';
const identity = { targetResidentId: residentId, provenance: 'test-suite', speakerId: 'tester', confidence: 0.99 };
const consent = (intentionId: string, overrides: Partial<ExternalConsentDecision> = {}): ExternalConsentDecision => ({
  decisionId: `decision-${intentionId}`,
  oneTimeUseReference: `once-${intentionId}`,
  purpose: 'intimate', scope: 'resident-sensitive-contact', issuedAt: Date.now() - 10,
  expiresAt: Date.now() + 60_000, revoked: false, paused: false, stopped: false, sos: false,
  actorId: residentId, targetId: 'resident-target', actionId: 'intimate', intentionId,
  authorityId: 'NEXA_INTIMACY_CANONICAL_AUTHORITY', verificationReference: `opaque:${randomUUID()}`,
  ...overrides,
});

class ControlThenObserveMind implements Mind {
  async deliberate(ctx: Readonly<CognitionContext>, signal: AbortSignal): Promise<DeliberationResult> {
    signal.throwIfAborted();
    for (const event of ctx.recentInfluences) {
      if (event.channel === 'voice' && typeof event.content === 'string') {
        const text = event.content.toLowerCase().trim();
        if (text === 'stop' || text === 'cancel') return { intention: null, control: 'STOP', acceptedInfluenceIds: [event.id], rejectedInfluenceIds: [], deferredInfluenceIds: [] };
        if (text === 'pause') return { intention: null, control: 'PAUSE', acceptedInfluenceIds: [event.id], rejectedInfluenceIds: [], deferredInfluenceIds: [] };
      }
    }
    return { intention: { id: randomUUID(), action: 'observe', urgency: 0.2, reasoning: 'test', createdAt: Date.now() }, control: 'NONE', acceptedInfluenceIds: [], rejectedInfluenceIds: [], deferredInfluenceIds: ctx.recentInfluences.map((event) => event.id) };
  }
}

class CooperativeDelayedActionSystem extends ActionSystem {
  aborted = false;
  mutated = false;
  override async execute(intention: Intention, signal?: AbortSignal): Promise<ActionResult> {
    return new Promise<ActionResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.mutated = true;
        resolve({ intentionId: intention.id, lifecycle: 'COMPLETED', success: true, partial: false, message: 'late mutation' });
      }, 200);
      const onAbort = () => {
        clearTimeout(timer);
        this.aborted = true;
        reject(signal?.reason instanceof Error ? signal.reason : new Error('ACTION_ABORTED'));
      };
      if (signal?.aborted) onAbort();
      else signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}

async function run() {
  console.log('=== CLEOPATRA INDEPENDENT AUDIT CORRECTION 01 TESTS ===\n');

  console.log('Truthful repository language');
  const contributing = readFileSync('CONTRIBUTING.md', 'utf8');
  for (const phrase of ['free will and autonomy systems', 'Total Autonomy First', 'AI/SI Citizenship Ready', 'exercise free will', 'think, feel needs']) {
    assert(!contributing.includes(phrase), `CONTRIBUTING removes unsupported phrase: ${phrase}`);
  }
  assert(contributing.includes('QUARANTINED / UNVERIFIED DONOR PROTOTYPE'), 'CONTRIBUTING states quarantine classification');
  assert(contributing.includes('FREE WILL PROVEN:           NO'), 'CONTRIBUTING states free will not proven');

  console.log('\nConsent exact-instance boundary');
  const exactIntentionId = randomUUID();
  const expected = { purpose: 'intimate', scope: 'resident-sensitive-contact', actorId: residentId, targetId: 'resident-target', actionId: 'intimate', intentionId: exactIntentionId, expectedAuthorityId: 'NEXA_INTIMACY_CANONICAL_AUTHORITY' };
  assert(validateExternalConsent(null, expected, new ConsentReplayLedger()).status === 'CONTRACT_PENDING', 'null consent remains contract pending');
  assert(validateExternalConsent(consent(exactIntentionId, { scope: 'wrong' }), expected, new ConsentReplayLedger()).status === 'MISMATCH', 'scope mismatch blocked');
  assert(validateExternalConsent(consent(exactIntentionId, { authorityId: 'wrong' }), expected, new ConsentReplayLedger()).status === 'MISMATCH', 'authority mismatch blocked');
  assert(validateExternalConsent(consent(exactIntentionId, { intentionId: 'other' }), expected, new ConsentReplayLedger()).status === 'MISMATCH', 'intention-instance mismatch blocked');
  assert(validateExternalConsent(consent(exactIntentionId, { verificationReference: '' }), expected, new ConsentReplayLedger()).status === 'MALFORMED', 'opaque verification reference required');
  assert(validateExternalConsent(consent(exactIntentionId, { oneTimeUseReference: '' }), expected, new ConsentReplayLedger()).status === 'MALFORMED', 'one-time-use reference required');
  const ledger = new ConsentReplayLedger();
  const exactDecision = consent(exactIntentionId);
  assert(validateExternalConsent(exactDecision, expected, ledger).status === 'CONTRACT_PENDING', 'exact envelope remains blocked pending canonical integration');
  assert(validateExternalConsent(exactDecision, expected, ledger).status === 'REPLAY', 'decision replay rejected');
  assert(validateExternalConsent(consent(exactIntentionId, { decisionId: 'new-decision', oneTimeUseReference: exactDecision.oneTimeUseReference }), expected, ledger).status === 'REPLAY', 'one-time reference replay rejected');

  console.log('\nActionSystem consent binding');
  const actionSystem = new ActionSystem(body(), residentId);
  const sensitiveId = randomUUID();
  const sensitive = await actionSystem.execute({ id: sensitiveId, action: 'intimate', target: 'resident-target', urgency: 0.5, parameters: { externalConsent: consent(sensitiveId) }, createdAt: Date.now() });
  assert(!sensitive.success && /CONTRACT_PENDING/.test(sensitive.message), 'exact sensitive preflight still fails closed');
  const replay = await actionSystem.execute({ id: sensitiveId, action: 'intimate', target: 'resident-target', urgency: 0.5, parameters: { externalConsent: consent(sensitiveId) }, createdAt: Date.now() });
  assert(!replay.success && /REPLAY/.test(replay.message), 'ActionSystem retains decision replay ledger');

  console.log('\nInfluence creators and direct-ingestion schemas');
  const mouse = createMouseInfluence({ x: 10, y: 20, button: 0 }, identity);
  const touch = createTouchInfluence({ touches: [{ id: 1, x: 10, y: 20 }], gesture: 'tap' }, identity);
  const schemaLoop = new CognitionLoop(new DeterministicBaselineMind(), new NeedsEngine(), new ActionSystem(body(), residentId), perception(), residentId);
  assert(schemaLoop.pushInfluence(mouse).status === 'ACCEPTED', 'factory mouse accepted');
  assert(schemaLoop.pushInfluence(touch).status === 'ACCEPTED', 'factory touch accepted');
  const malformedMouse = { ...createMouseInfluence({ x: 1, y: 2 }, identity), id: randomUUID(), content: { x: 'bad', y: 2 } as any };
  assert(schemaLoop.pushInfluence(malformedMouse).status === 'REJECTED_MALFORMED', 'direct malformed mouse rejected');
  const malformedMouseExtra = { ...createMouseInfluence({ x: 1, y: 2 }, identity), id: randomUUID(), content: { x: 1, y: 2, execute: true } as any };
  assert(schemaLoop.pushInfluence(malformedMouseExtra).status === 'REJECTED_MALFORMED', 'mouse unknown field rejected');
  const malformedTouch = { ...createTouchInfluence({ touches: [{ id: 1, x: 1, y: 2 }] }, identity), id: randomUUID(), content: { touches: [{ id: 1, x: Number.NaN, y: 2 }] } as any };
  assert(schemaLoop.pushInfluence(malformedTouch).status === 'REJECTED_MALFORMED', 'direct malformed touch rejected');
  const duplicateTouchIds = { ...createTouchInfluence({ touches: [{ id: 1, x: 1, y: 2 }] }, identity), id: randomUUID(), content: { touches: [{ id: 1, x: 1, y: 2 }, { id: 1, x: 3, y: 4 }] } as any };
  assert(schemaLoop.pushInfluence(duplicateTouchIds).status === 'REJECTED_MALFORMED', 'duplicate touch-point IDs rejected');

  console.log('\nSeen-at-ingestion replay ledger');
  const replayLoop = new CognitionLoop(new DeterministicBaselineMind(), new NeedsEngine(), new ActionSystem(body(), residentId), perception(), residentId);
  const cleared = createVoiceInfluence('unknown', identity);
  assert(replayLoop.pushInfluence(cleared).status === 'ACCEPTED', 'event accepted before clearing');
  replayLoop.stop({ clearPending: true });
  assert(replayLoop.pushInfluence({ ...cleared, timestamp: Date.now(), expiresAt: Date.now() + 5_000, consumed: false }).status === 'REJECTED_REPLAY', 'ID reuse rejected after stop clearing');
  const expiring = { ...createVoiceInfluence('unknown', identity), timestamp: Date.now() - 1_000, expiresAt: Date.now() + 20 };
  assert(replayLoop.pushInfluence(expiring).status === 'ACCEPTED', 'short remaining lifetime accepted with valid original TTL');
  await wait(30);
  replayLoop.getStatus();
  assert(replayLoop.pushInfluence({ ...expiring, timestamp: Date.now(), expiresAt: Date.now() + 5_000 }).status === 'REJECTED_REPLAY', 'ID reuse rejected after expiration removal');

  console.log('\nDeliberation duplicate-ID rejection');
  const duplicateEvent = createVoiceInfluence('unknown', identity);
  const duplicateMind: Mind = { async deliberate(ctx, signal) {
    signal.throwIfAborted();
    const id = ctx.recentInfluences[0]?.id;
    return { intention: null, control: 'NONE', acceptedInfluenceIds: id ? [id, id] : [], rejectedInfluenceIds: [], deferredInfluenceIds: [] };
  }};
  const duplicateActions = new ActionSystem(body(), residentId);
  const duplicateLoop = new CognitionLoop(duplicateMind, new NeedsEngine(), duplicateActions, perception(), residentId, 25, 100, 100);
  duplicateLoop.pushInfluence(duplicateEvent);
  duplicateLoop.start(); await wait(70); duplicateLoop.stop();
  assert(duplicateLoop.getStatus().lastBoundaryRejection === 'DUPLICATE_DELIBERATION_IDS', 'duplicate deliberation IDs rejected with reason');
  assert(duplicateActions.getActionCount() === 0, 'duplicate-ID envelope executes no action');

  console.log('\nPersistent stop and authorized resume');
  const controlActions = new ActionSystem(body(), residentId);
  const controlLoop = new CognitionLoop(new ControlThenObserveMind(), new NeedsEngine(), controlActions, perception(), residentId, 25, 100, 100,
    async (request) => request.authorityReference === 'approved-control' && request.actorId === 'controller');
  const stopEvent = createVoiceInfluence('stop', identity, 0.9);
  controlLoop.pushInfluence(stopEvent);
  controlLoop.start(); await wait(80);
  assert(controlLoop.getStatus().controlState === 'STOPPED', 'stop command creates persistent stopped state');
  assert(controlLoop.getStatus().running === false, 'stop command stops loop');
  const actionCountAtStop = controlActions.getActionCount();
  await wait(80);
  assert(controlActions.getActionCount() === actionCountAtStop, 'simulated drives do not resume after persistent stop');
  assert(controlLoop.start() === false, 'ordinary start cannot bypass persistent stop');
  assert(await controlLoop.resume({ targetResidentId: residentId, actorId: 'controller', authorityReference: 'denied', requestedAt: Date.now() }) === false, 'unauthorized resume denied');
  assert(await controlLoop.resume({ targetResidentId: residentId, actorId: 'controller', authorityReference: 'approved-control', requestedAt: Date.now() }) === true, 'authorized resume succeeds');
  await wait(80);
  assert(controlLoop.getStatus().controlState === 'ACTIVE' && controlActions.getActionCount() > actionCountAtStop, 'authorized resume reactivates decisions');
  controlLoop.stop();

  const pauseActions = new ActionSystem(body(), residentId);
  const pauseLoop = new CognitionLoop(new ControlThenObserveMind(), new NeedsEngine(), pauseActions, perception(), residentId, 25, 100, 100, () => true);
  pauseLoop.pushInfluence(createVoiceInfluence('pause', identity, 0.9));
  pauseLoop.start(); await wait(80);
  assert(pauseLoop.getStatus().controlState === 'PAUSED', 'pause command creates persistent paused state');
  assert(await pauseLoop.resume({ targetResidentId: residentId, actorId: 'controller', authorityReference: 'approved', requestedAt: Date.now() }), 'authorized pause resume succeeds');
  pauseLoop.stop();

  console.log('\nAbortSignal cancellation boundaries');
  let mindAborted = false;
  const hangingMind: Mind = { async deliberate(_ctx, signal) {
    return new Promise<DeliberationResult>((_resolve, reject) => {
      signal.addEventListener('abort', () => { mindAborted = true; reject(signal.reason); }, { once: true });
    });
  }};
  const mindTimeoutLoop = new CognitionLoop(hangingMind, new NeedsEngine(), new ActionSystem(body(), residentId), perception(), residentId, 25, 30, 100);
  mindTimeoutLoop.start(); await wait(70); mindTimeoutLoop.stop();
  assert(mindAborted, 'deliberation timeout aborts cooperative Mind');
  assert(mindTimeoutLoop.getStatus().activeOperationCount === 0, 'timed-out Mind controller released');

  let stopAborted = false;
  const stopMind: Mind = { async deliberate(_ctx, signal) {
    return new Promise<DeliberationResult>((_resolve, reject) => {
      signal.addEventListener('abort', () => { stopAborted = true; reject(signal.reason); }, { once: true });
    });
  }};
  const stopAbortLoop = new CognitionLoop(stopMind, new NeedsEngine(), new ActionSystem(body(), residentId), perception(), residentId, 25, 1_000, 100);
  stopAbortLoop.start(); await wait(20); stopAbortLoop.stop(); await wait(20);
  assert(stopAborted, 'external stop aborts active cooperative Mind');

  const actionMind: Mind = { async deliberate(_ctx, signal) {
    signal.throwIfAborted();
    return { intention: { id: randomUUID(), action: 'observe', urgency: 0.5, reasoning: 'action cancellation test', createdAt: Date.now() }, control: 'NONE', acceptedInfluenceIds: [], rejectedInfluenceIds: [], deferredInfluenceIds: [] };
  }};
  const delayedActions = new CooperativeDelayedActionSystem(body(), residentId);
  const actionTimeoutLoop = new CognitionLoop(actionMind, new NeedsEngine(), delayedActions, perception(), residentId, 25, 100, 30);
  actionTimeoutLoop.start(); await wait(90); actionTimeoutLoop.stop(); await wait(30);
  assert(delayedActions.aborted, 'action timeout passes abort signal to cooperative action');
  assert(!delayedActions.mutated, 'cooperative timed-out action performs no late mutation');

  console.log('\nLegacy hardening boundaries retained');
  const creatorLoop = new CognitionLoop(new DeterministicBaselineMind(), new NeedsEngine(), new ActionSystem(body(), residentId), perception(), residentId);
  await assertRejects(() => createVoiceInfluence('', identity), 'empty transcript rejected');
  await assertRejects(() => createVoiceInfluence('walk', { ...identity, targetResidentId: '' }), 'missing resident rejected');
  await assertRejects(() => createVoiceInfluence('walk', { ...identity, provenance: '' }), 'missing provenance rejected');
  await assertRejects(() => createVoiceInfluence('walk', identity, 2), 'invalid strength rejected');
  await assertRejects(() => createVoiceInfluence('walk', identity, 0.7, 10), 'invalid TTL rejected');
  const future = { ...createVoiceInfluence('walk', identity), timestamp: Date.now() + 20_000, expiresAt: Date.now() + 25_000 };
  assert(creatorLoop.pushInfluence(future).status === 'REJECTED_FUTURE_TIMESTAMP', 'future timestamp rejected');
  const wrong = { ...createVoiceInfluence('walk', identity), targetResidentId: 'other' };
  assert(creatorLoop.pushInfluence(wrong).status === 'REJECTED_WRONG_RESIDENT', 'wrong Resident rejected');
  const queueLoop = new CognitionLoop(new DeterministicBaselineMind(), new NeedsEngine(), new ActionSystem(body(), residentId), perception(), residentId);
  for (let i = 0; i < 20; i++) assert(queueLoop.pushInfluence(createVoiceInfluence(`unknown ${i}`, identity)).status === 'ACCEPTED', `queue accepts item ${i + 1}`);
  assert(queueLoop.pushInfluence(createVoiceInfluence('overflow', identity)).status === 'REJECTED_QUEUE_FULL', 'queue overflow fails closed');
  assert(new NeedsEngine().describeSignals().startsWith('Simulated'), 'need status remains neutral simulation language');

  console.log('\nPackage-install limitation remains explicit');
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  assert(Object.keys(lock.packages).length === 1, 'lockfile is still root-only and not misrepresented as complete');
  const readme = readFileSync('README.md', 'utf8');
  assert(readme.includes('clean `npm ci` remain unproven'), 'README preserves npm ci limitation');
  assert(readme.includes('JavaScript cannot forcibly terminate a non-cooperative promise'), 'README preserves cooperative-cancellation limitation');

  console.log('\n=== RESULTS ===');
  console.log(`Passed: ${passed}`); console.log(`Failed: ${failed}`);
  failures.forEach((failure) => console.log('  -', failure));
  console.log('\n--- EVIDENCE BLOCK ---');
  console.log('test_command: ts-node src/tests/hardening.test.ts');
  console.log('runtime: node ' + process.version);
  console.log(`total_tests: ${passed + failed}`); console.log(`pass: ${passed}`); console.log(`fail: ${failed}`); console.log('skip: 0');
  if (failed) process.exit(1);
}
run().catch((error) => { console.error(error); process.exit(1); });
