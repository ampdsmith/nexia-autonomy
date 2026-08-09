import { randomUUID } from 'node:crypto';
import { ActionSystem } from '../core/ActionSystem';
import { ConsentReplayLedger, ExternalConsentDecision, validateExternalConsent } from '../core/ConsentBoundary';
import { BodyState } from '../core/types';

let passed = 0;
let failed = 0;
const failures: string[] = [];
function assert(condition: boolean, name: string) {
  if (condition) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; failures.push(name); console.log(`  FAIL  ${name}`); }
}

const actorId = 'resident-consent-audit';
const targetId = 'resident-target';
const authorityId = 'NEXA_INTIMACY_CANONICAL_AUTHORITY';
const scope = 'resident-sensitive-contact';
const body = (): BodyState => ({ location: 'home', posture: 'standing', clothing: ['basic'], energyLevel: 80, inventory: [] });

function decision(intentionId: string, ordinal: number): ExternalConsentDecision {
  return {
    decisionId: `decision-${ordinal}-${randomUUID()}`,
    oneTimeUseReference: `once-${ordinal}-${randomUUID()}`,
    purpose: 'intimate',
    scope,
    issuedAt: Date.now() - 10,
    expiresAt: Date.now() + 60_000,
    revoked: false,
    paused: false,
    stopped: false,
    sos: false,
    actorId,
    targetId,
    actionId: 'intimate',
    intentionId,
    authorityId,
    verificationReference: `opaque:${randomUUID()}`,
  };
}

function expectation(intentionId: string) {
  return { purpose: 'intimate', scope, actorId, targetId, actionId: 'intimate', intentionId, expectedAuthorityId: authorityId };
}

async function run() {
  console.log('=== CLEOPATRA CONSENT REPLAY CAPACITY TESTS ===\n');

  console.log('Bounded ledger fails closed instead of evicting old one-time identities');
  const ledger = new ConsentReplayLedger(3);
  const firstId = 'intention-0';
  const first = decision(firstId, 0);
  assert(validateExternalConsent(first, expectation(firstId), ledger).status === 'CONTRACT_PENDING', 'first exact-instance preflight recorded');

  for (let i = 1; i <= 2; i++) {
    const intentionId = `intention-${i}`;
    assert(validateExternalConsent(decision(intentionId, i), expectation(intentionId), ledger).status === 'CONTRACT_PENDING', `capacity slot ${i + 1} recorded`);
  }

  const overflowId = 'intention-overflow';
  assert(validateExternalConsent(decision(overflowId, 99), expectation(overflowId), ledger).status === 'REPLAY_LEDGER_FULL', 'new identity fails closed when replay ledger is full');
  assert(validateExternalConsent(first, expectation(firstId), ledger).status === 'REPLAY', 'old decision remains replay-blocked after capacity is reached');
  assert(ledger.getEntryCount() === 3 && ledger.getCapacity() === 3, 'ledger preserves bounded capacity without eviction');

  console.log('\nActionSystem preserves the same fail-closed capacity behavior');
  const actions = new ActionSystem(body(), actorId, { consentReplayLimit: 2 });
  const id1 = 'action-intention-1';
  const id2 = 'action-intention-2';
  const id3 = 'action-intention-3';
  const d1 = decision(id1, 201);
  const d2 = decision(id2, 202);
  const d3 = decision(id3, 203);
  const r1 = await actions.execute({ id: id1, action: 'intimate', target: targetId, urgency: 0.5, parameters: { externalConsent: d1 }, createdAt: Date.now() });
  const r2 = await actions.execute({ id: id2, action: 'intimate', target: targetId, urgency: 0.5, parameters: { externalConsent: d2 }, createdAt: Date.now() });
  const r3 = await actions.execute({ id: id3, action: 'intimate', target: targetId, urgency: 0.5, parameters: { externalConsent: d3 }, createdAt: Date.now() });
  const replay = await actions.execute({ id: id1, action: 'intimate', target: targetId, urgency: 0.5, parameters: { externalConsent: d1 }, createdAt: Date.now() });
  assert(/CONTRACT_PENDING/.test(r1.message), 'ActionSystem records first exact-instance preflight');
  assert(/CONTRACT_PENDING/.test(r2.message), 'ActionSystem records second exact-instance preflight');
  assert(/REPLAY_LEDGER_FULL/.test(r3.message), 'ActionSystem fails closed when consent replay capacity is full');
  assert(/REPLAY/.test(replay.message), 'ActionSystem still rejects the old one-time decision after capacity is reached');

  console.log('\n=== RESULTS ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  failures.forEach((failure) => console.log('  -', failure));
  if (failed) process.exit(1);
}

run().catch((error) => { console.error(error); process.exit(1); });
