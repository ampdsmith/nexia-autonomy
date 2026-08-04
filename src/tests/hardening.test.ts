import { randomUUID } from 'node:crypto';
import { validateExternalConsent, ExternalConsentDecision } from '../core/ConsentBoundary';
import { ActionSystem } from '../core/ActionSystem';
import { CognitionLoop } from '../core/CognitionLoop';
import { NeedsEngine } from '../core/NeedsEngine';
import { DeterministicBaselineMind } from '../minds/DeterministicBaselineMind';
import { createVoiceInfluence } from '../input/InfluenceChannels';
import { BodyState, Perception, InfluenceEvent, Mind, CognitionContext, DeliberationResult } from '../core/types';

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
const body = (): BodyState => ({ location: 'home', posture: 'standing', clothing: ['basic'], energyLevel: 80, inventory: [] });
const perception = (): Perception => ({ timestamp: Date.now(), location: 'home', nearbyObjects: ['kitchen', 'bathroom'], nearbyResidents: [], environmentNotes: [] });
const residentId = 'resident-test-1';
const identity = { targetResidentId: residentId, provenance: 'test-suite', speakerId: 'tester', confidence: 0.99 };
const consent = (overrides: Partial<ExternalConsentDecision> = {}): ExternalConsentDecision => ({
  decisionId: 'd1', purpose: 'intimate', scope: 'bounded-test', issuedAt: Date.now() - 10,
  expiresAt: Date.now() + 60_000, revoked: false, paused: false, stopped: false, sos: false,
  actorId: residentId, targetId: 'resident-target', actionId: 'intimate', authorityId: 'external-authority',
  verificationToken: 'unverified-donor-token', ...overrides,
});

async function run() {
  console.log('=== CLEOPATRA TAKEOVER HARDENING TESTS ===\n');

  console.log('Consent');
  const expected = { purpose: 'intimate', actorId: residentId, targetId: 'resident-target', actionId: 'intimate' };
  assert(validateExternalConsent(null, expected).status === 'CONTRACT_PENDING', 'null consent remains contract pending');
  assert(validateExternalConsent(consent({ sos: true }), expected).status === 'SOS', 'SOS blocks');
  assert(validateExternalConsent(consent({ stopped: true }), expected).status === 'STOPPED', 'stop blocks');
  assert(validateExternalConsent(consent({ paused: true }), expected).status === 'PAUSED', 'pause blocks');
  assert(validateExternalConsent(consent({ revoked: true }), expected).status === 'REVOKED', 'revocation blocks');
  assert(validateExternalConsent(consent({ expiresAt: Date.now() - 1 }), expected).status === 'EXPIRED', 'expiry blocks');
  assert(validateExternalConsent(consent({ actorId: '' }), expected).status === 'MALFORMED', 'missing actor is malformed');
  assert(validateExternalConsent(consent({ targetId: 'wrong' }), expected).status === 'MISMATCH', 'target mismatch blocked');
  assert(validateExternalConsent(consent(), expected).status === 'CONTRACT_PENDING', 'well-shaped donor envelope never authorizes');
  assert(validateExternalConsent(consent(), expected).allowed === false, 'donor consent always false');

  console.log('\nActionSystem');
  const actions = new ActionSystem(body(), residentId);
  const leaked = actions.getBody(); leaked.clothing.push('mutated'); leaked.inventory.push('mutated');
  assert(actions.getBody().clothing.length === 1 && actions.getBody().inventory.length === 0, 'body snapshots cannot mutate internal arrays');
  const sensitiveNoTarget = await actions.execute({ id: randomUUID(), action: 'hug', urgency: 0.5, createdAt: Date.now() });
  assert(!sensitiveNoTarget.success && /explicit target/.test(sensitiveNoTarget.message), 'sensitive action requires target');
  const sensitivePending = await actions.execute({ id: randomUUID(), action: 'intimate', target: 'resident-target', urgency: 0.5,
    parameters: { externalConsent: consent() }, createdAt: Date.now() });
  assert(!sensitivePending.success && /CONTRACT_PENDING/.test(sensitivePending.message), 'well-shaped consent remains blocked');
  const before = actions.getBody();
  const eat = await actions.execute({ id: randomUUID(), action: 'eat', urgency: 0.5, createdAt: Date.now() });
  assert(eat.lifecycle === 'NOT_IMPLEMENTED' && !eat.success, 'unimplemented action is truthful');
  assert(JSON.stringify(before) === JSON.stringify(actions.getBody()), 'unimplemented action does not mutate body');

  console.log('\nInfluence creators');
  await assertRejects(() => createVoiceInfluence('', identity), 'empty transcript rejected');
  await assertRejects(() => createVoiceInfluence('walk', { ...identity, targetResidentId: '' }), 'missing resident rejected');
  await assertRejects(() => createVoiceInfluence('walk', { ...identity, provenance: '' }), 'missing provenance rejected');
  await assertRejects(() => createVoiceInfluence('walk', identity, 2), 'invalid strength rejected');
  await assertRejects(() => createVoiceInfluence('walk', identity, 0.7, 10), 'invalid TTL rejected');

  console.log('\nIngestion and immutability');
  const mind = new DeterministicBaselineMind();
  const loop = new CognitionLoop(mind, new NeedsEngine(), new ActionSystem(body(), residentId), perception(), residentId, 50, 100, 100);
  const event = createVoiceInfluence('walk', identity, 0.7, 5_000);
  assert(loop.pushInfluence(event).status === 'ACCEPTED', 'first event accepted');
  assert(loop.pushInfluence({ ...event }).status === 'REJECTED_DUPLICATE_PENDING', 'pending duplicate rejected');
  const noTarget = { ...createVoiceInfluence('walk', identity), targetResidentId: '' };
  assert(loop.pushInfluence(noTarget).status === 'REJECTED_MALFORMED', 'omitted target rejected at loop boundary');
  const wrong = { ...createVoiceInfluence('walk', identity), targetResidentId: 'other' };
  assert(loop.pushInfluence(wrong).status === 'REJECTED_WRONG_RESIDENT', 'wrong resident rejected');
  const future = { ...createVoiceInfluence('walk', identity), timestamp: Date.now() + 20_000, expiresAt: Date.now() + 25_000 };
  assert(loop.pushInfluence(future).status === 'REJECTED_FUTURE_TIMESTAMP', 'future timestamp rejected');
  const huge = { ...createVoiceInfluence('walk', identity), content: 'x'.repeat(5_000) };
  assert(loop.pushInfluence(huge).status === 'REJECTED_MALFORMED', 'oversized content rejected');

  const queueLoop = new CognitionLoop(mind, new NeedsEngine(), new ActionSystem(body(), residentId), perception(), residentId);
  for (let i = 0; i < 20; i++) assert(queueLoop.pushInfluence(createVoiceInfluence(`unknown ${i}`, identity)).status === 'ACCEPTED', `queue accepts item ${i + 1}`);
  assert(queueLoop.pushInfluence(createVoiceInfluence('overflow', identity)).status === 'REJECTED_QUEUE_FULL', 'queue overflow fails closed without silent eviction');

  console.log('\nMind policy');
  const stop = createVoiceInfluence('stop', identity, 0.9);
  const critical: CognitionContext = {
    needs: { timestamp: Date.now(), needs: { hunger: 100, thirst: 100, bladder: 100, energy: 100, hygiene: 5, social: 5, intimacy: 5, comfort: 5, safety: 5, curiosity: 5, purpose: 5 }, awareSignals: ['hunger'], criticalSignals: ['hunger'] },
    perception: perception(), recentInfluences: [stop], recentActions: [], bodyState: body(),
  };
  const stopResult = await mind.deliberate(critical);
  assert(stopResult.intention === null && stopResult.acceptedInfluenceIds.includes(stop.id), 'stop control precedes critical drive policy');
  const neg = createVoiceInfluence("don't walk", identity, 0.9);
  const neutral: CognitionContext = { ...critical, needs: { ...critical.needs, needs: { ...critical.needs.needs, hunger: 5, thirst: 5, bladder: 5, energy: 5 }, awareSignals: [], criticalSignals: [] }, recentInfluences: [neg] };
  const negResult = await mind.deliberate(neutral);
  assert(negResult.rejectedInfluenceIds.includes(neg.id), 'negated command rejected');

  console.log('\nMind boundary and intention validation');
  let mutableObserved = false;
  const mutationMind: Mind = { name: 'mutation-test', async deliberate(ctx) {
    try { (ctx.bodyState.clothing as string[]).push('tamper'); } catch { mutableObserved = true; }
    try { (ctx.recentInfluences[0] as InfluenceEvent).consumed = true; } catch { mutableObserved = true; }
    return { intention: null, acceptedInfluenceIds: [], rejectedInfluenceIds: [], deferredInfluenceIds: ctx.recentInfluences.map((e) => e.id) };
  }};
  const immutableActions = new ActionSystem(body(), residentId);
  const immutableLoop = new CognitionLoop(mutationMind, new NeedsEngine(), immutableActions, perception(), residentId, 50, 100, 100);
  immutableLoop.pushInfluence(createVoiceInfluence('unknown', identity));
  immutableLoop.start(); await new Promise((r) => setTimeout(r, 80)); immutableLoop.stop();
  assert(mutableObserved, 'mind context is frozen');
  assert(immutableActions.getBody().clothing.length === 1, 'mind cannot mutate body through context');

  const invalidMind: Mind = { name: 'invalid-intention', async deliberate(ctx): Promise<DeliberationResult> {
    return { intention: { id: '', action: 'walk', urgency: 2, createdAt: Date.now() } as any,
      acceptedInfluenceIds: [], rejectedInfluenceIds: [], deferredInfluenceIds: ctx.recentInfluences.map((e) => e.id) };
  }};
  const invalidActions = new ActionSystem(body(), residentId);
  const invalidLoop = new CognitionLoop(invalidMind, new NeedsEngine(), invalidActions, perception(), residentId, 50, 100, 100);
  invalidLoop.start(); await new Promise((r) => setTimeout(r, 80)); invalidLoop.stop();
  assert(invalidActions.getActionCount() === 0, 'invalid intention is discarded before action execution');

  const hangingMind: Mind = { name: 'hanging-mind', deliberate: async () => new Promise<DeliberationResult>(() => {}) };
  const timeoutLoop = new CognitionLoop(hangingMind, new NeedsEngine(), new ActionSystem(body(), residentId), perception(), residentId, 50, 30, 30);
  timeoutLoop.start(); await new Promise((r) => setTimeout(r, 90)); timeoutLoop.stop();
  assert(timeoutLoop.getStatus().running === false, 'hanging mind cannot prevent stop');

  console.log('\nStop and neutral claims');
  const pendingLoop = new CognitionLoop(mind, new NeedsEngine(), new ActionSystem(body(), residentId), perception(), residentId);
  pendingLoop.pushInfluence(createVoiceInfluence('walk', identity));
  pendingLoop.stop();
  assert(pendingLoop.getStatus().pendingInfluences === 0, 'stop clears pending influences by default');
  assert(new NeedsEngine().describeSignals().startsWith('Simulated'), 'need status is explicitly simulated, not first-person awareness');

  console.log('\n=== RESULTS ===');
  console.log(`Passed: ${passed}`); console.log(`Failed: ${failed}`);
  failures.forEach((f) => console.log('  -', f));
  console.log('\n--- EVIDENCE BLOCK ---');
  console.log('test_command: node --require ts-node/register src/tests/hardening.test.ts');
  console.log('runtime: node ' + process.version);
  console.log(`total_tests: ${passed + failed}`); console.log(`pass: ${passed}`); console.log(`fail: ${failed}`); console.log('skip: 0');
  if (failed) process.exit(1);
}
run().catch((error) => { console.error(error); process.exit(1); });
