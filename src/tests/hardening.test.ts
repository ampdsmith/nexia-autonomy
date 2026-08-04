/**
 * Executable tests — correction cycle 002
 * Run: npm test
 */

import { validateExternalConsent } from '../core/ConsentBoundary';
import { ActionSystem } from '../core/ActionSystem';
import { CognitionLoop } from '../core/CognitionLoop';
import { NeedsEngine } from '../core/NeedsEngine';
import { DeterministicBaselineMind } from '../minds/DeterministicBaselineMind';
import { createVoiceInfluence } from '../input/InfluenceChannels';
import { BodyState, Perception, InfluenceEvent } from '../core/types';
import { v4 as uuid } from 'uuid';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  FAIL  ${name}`);
  }
}

function body(): BodyState {
  return { location: 'home', posture: 'standing', clothing: ['basic'], energyLevel: 80, inventory: [] };
}

function perception(): Perception {
  return {
    timestamp: Date.now(),
    location: 'home',
    nearbyObjects: ['kitchen', 'bathroom'],
    nearbyResidents: [],
    environmentNotes: [],
  };
}

async function run() {
  console.log('=== HARDENING CORRECTION 002 TESTS ===\n');

  // Consent paths
  console.log('Consent');
  assert(validateExternalConsent(null, 'intimate').status === 'CONTRACT_PENDING', 'null → CONTRACT_PENDING');
  assert(validateExternalConsent(null, 'intimate').allowed === false, 'null not allowed');
  const base = {
    decisionId: 'd1', purpose: 'intimate', scope: 's', issuedAt: Date.now(),
    expiresAt: Date.now() + 60000, revoked: false, paused: false, stopped: false, sos: false,
  };
  assert(validateExternalConsent({ ...base, sos: true }, 'intimate').status === 'SOS', 'SOS');
  assert(validateExternalConsent({ ...base, stopped: true }, 'intimate').status === 'STOPPED', 'STOPPED');
  assert(validateExternalConsent({ ...base, paused: true }, 'intimate').status === 'PAUSED', 'PAUSED');
  assert(validateExternalConsent({ ...base, revoked: true }, 'intimate').status === 'REVOKED', 'REVOKED');
  assert(validateExternalConsent({ ...base, issuedAt: Date.now()-10000, expiresAt: Date.now()-5000 }, 'intimate').status === 'EXPIRED', 'EXPIRED');
  assert(validateExternalConsent({ ...base, expiresAt: base.issuedAt - 1 }, 'intimate').status === 'MALFORMED', 'expires before issued');
  assert(validateExternalConsent(base, 'intimate').status === 'CONTRACT_PENDING', 'valid-looking still PENDING');
  assert(validateExternalConsent(base, 'intimate').allowed === false, 'never allowed');

  // ActionSystem
  console.log('\nActionSystem');
  const actions = new ActionSystem(body());
  for (const a of ['hug', 'touch', 'kiss', 'grab', 'intimate', 'speak'] as const) {
    const r = await actions.execute({ id: uuid(), action: a, urgency: 0.5, createdAt: Date.now() });
    assert(r.success === false, `${a} not success`);
  }
  const before = actions.getBody();
  const eatR = await actions.execute({ id: uuid(), action: 'eat', urgency: 0.5, createdAt: Date.now() });
  assert(eatR.lifecycle === 'NOT_IMPLEMENTED' && eatR.success === false, 'eat NOT_IMPLEMENTED');
  assert(JSON.stringify(before) === JSON.stringify(actions.getBody()), 'no body mutation');
  assert(!eatR.newStateHints, 'no need hints on NOT_IMPLEMENTED');

  // Influence ingestion
  console.log('\nIngestion');
  const mind = new DeterministicBaselineMind();
  const needs = new NeedsEngine();
  const act = new ActionSystem(body());
  const residentId = 'resident-test-1';
  const loop = new CognitionLoop(mind, needs, act, perception(), residentId, 100);

  const ev = createVoiceInfluence('walk', 0.7, 5000);
  const r1 = loop.pushInfluence(ev);
  assert(r1.status === 'ACCEPTED', 'first accept');
  const r2 = loop.pushInfluence({ ...ev });
  assert(r2.status === 'REJECTED_DUPLICATE_PENDING', 'pending duplicate rejected');

  const badTtl: InfluenceEvent = {
    id: uuid(), channel: 'voice', content: 'x', timestamp: Date.now(), strength: 0.5,
    expiresAt: Date.now() + 10, consumed: false,
  };
  assert(loop.pushInfluence(badTtl).status === 'REJECTED_MALFORMED', 'too-short TTL rejected');

  const wrong: InfluenceEvent = {
    ...createVoiceInfluence('walk', 0.7, 5000),
    targetResidentId: 'other-resident',
  };
  assert(loop.pushInfluence(wrong).status === 'REJECTED_WRONG_RESIDENT', 'wrong resident');

  // Mind negation
  console.log('\nMind');
  const neg = createVoiceInfluence("don't walk", 0.9);
  const negRes = await mind.deliberate({
    needs: {
      timestamp: Date.now(),
      needs: { hunger: 5, thirst: 5, bladder: 5, energy: 5, hygiene: 5, social: 5, intimacy: 5, comfort: 5, safety: 5, curiosity: 5, purpose: 5 },
      awareSignals: [], criticalSignals: [],
    },
    perception: perception(),
    recentInfluences: [neg],
    recentActions: [],
    bodyState: body(),
  });
  assert(negRes.rejectedInfluenceIds.includes(neg.id), 'negation rejected');

  // Stop / generation
  console.log('\nStop');
  loop.start();
  await new Promise(r => setTimeout(r, 50));
  loop.stop();
  await new Promise(r => setTimeout(r, 200));
  loop.start();
  assert(loop.getStatus().running === true, 'restart ok');
  loop.stop();
  assert(loop.getStatus().running === false, 'stopped');

  // Summary
  console.log('\n=== RESULTS ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failures.length) failures.forEach(f => console.log('  -', f));

  console.log('\n--- EVIDENCE BLOCK ---');
  console.log('test_command: npm test');
  console.log('runtime: node ' + process.version);
  console.log(`total_tests: ${passed + failed}`);
  console.log(`pass: ${passed}`);
  console.log(`fail: ${failed}`);
  console.log(`skip: 0`);
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
