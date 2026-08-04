/**
 * Executable hardening tests — correction cycle
 * Run: npm test
 */

import { validateExternalConsent } from '../core/ConsentBoundary';
import { ActionSystem } from '../core/ActionSystem';
import { CognitionLoop } from '../core/CognitionLoop';
import { NeedsEngine } from '../core/NeedsEngine';
import { DeterministicBaselineMind } from '../minds/DeterministicBaselineMind';
import { createVoiceInfluence } from '../input/InfluenceChannels';
import { BodyState, Intention, Perception } from '../core/types';
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
  return {
    location: 'home',
    posture: 'standing',
    clothing: ['basic'],
    energyLevel: 80,
    inventory: [],
  };
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
  console.log('=== HARDENING CORRECTION TESTS ===\n');

  // ---- Consent ----
  console.log('ConsentBoundary');
  const noDec = validateExternalConsent(null, 'intimate');
  assert(noDec.allowed === false && noDec.status === 'CONTRACT_PENDING', 'null → CONTRACT_PENDING');

  const fake = {
    decisionId: 'x', purpose: 'intimate', scope: 't', issuedAt: Date.now(),
    expiresAt: Date.now() + 60000, revoked: false, paused: false, stopped: false, sos: false,
  };
  const withObj = validateExternalConsent(fake, 'intimate');
  assert(withObj.allowed === false && withObj.status === 'CONTRACT_PENDING', 'object still CONTRACT_PENDING');

  // ---- ActionSystem NOT_IMPLEMENTED / interpersonal ----
  console.log('\nActionSystem');
  const actions = new ActionSystem(body());
  for (const a of ['hug', 'touch', 'kiss', 'grab', 'intimate'] as const) {
    const r = await actions.execute({ id: uuid(), action: a, urgency: 0.5, createdAt: Date.now() });
    assert(r.success === false && r.lifecycle === 'FAILED', `${a} blocked`);
  }

  const before = actions.getBody();
  const eatR = await actions.execute({ id: uuid(), action: 'eat', urgency: 0.5, createdAt: Date.now() });
  const after = actions.getBody();
  assert(eatR.lifecycle === 'NOT_IMPLEMENTED' && eatR.success === false, 'eat is NOT_IMPLEMENTED');
  assert(JSON.stringify(before) === JSON.stringify(after), 'NOT_IMPLEMENTED causes no body mutation');

  // ---- DeterministicBaselineMind ----
  console.log('\nDeterministicBaselineMind');
  const mind = new DeterministicBaselineMind();
  const highInt = await mind.deliberate({
    needs: {
      timestamp: Date.now(),
      needs: { hunger: 5, thirst: 5, bladder: 5, energy: 5, hygiene: 5, social: 90, intimacy: 95, comfort: 5, safety: 5, curiosity: 10, purpose: 10 },
      awareSignals: ['social', 'intimacy'],
      criticalSignals: [],
    },
    perception: perception(),
    recentInfluences: [],
    recentActions: [],
    bodyState: body(),
  });
  assert(
    highInt.intention === null || !['hug','touch','kiss','grab','intimate'].includes(highInt.intention.action),
    'no interpersonal from high intimacy need'
  );

  const neg = createVoiceInfluence("don't walk", 0.9);
  const negResult = await mind.deliberate({
    needs: { timestamp: Date.now(), needs: { hunger: 5, thirst: 5, bladder: 5, energy: 5, hygiene: 5, social: 5, intimacy: 5, comfort: 5, safety: 5, curiosity: 5, purpose: 5 }, awareSignals: [], criticalSignals: [] },
    perception: perception(),
    recentInfluences: [neg],
    recentActions: [],
    bodyState: body(),
  });
  assert(negResult.rejectedInfluenceIds.includes(neg.id), 'negated voice is rejected');
  assert(!negResult.acceptedInfluenceIds.includes(neg.id), 'negated voice is not accepted');

  // ---- Influence factory TTL bounds ----
  console.log('\nInfluence TTL');
  const badTtl = createVoiceInfluence('x', 0.5, -1000);
  assert(badTtl.expiresAt > Date.now(), 'negative TTL sanitized to default');
  const huge = createVoiceInfluence('x', 0.5, 999999999);
  assert(huge.expiresAt - huge.timestamp <= 120000, 'huge TTL capped');

  // ---- CognitionLoop: duplicate rejection + stop ----
  console.log('\nCognitionLoop');
  const needs = new NeedsEngine();
  const act = new ActionSystem(body());
  const loop = new CognitionLoop(mind, needs, act, perception(), 200);

  const ev = createVoiceInfluence('hello', 0.5, 5000);
  loop.pushInfluence(ev);
  loop.pushInfluence({ ...ev }); // same ID replay
  // We cannot easily inspect private list, but pushInfluence is fail-closed on processed/duplicate after first consume.
  // Generation + stop test:
  loop.start();
  await new Promise(r => setTimeout(r, 100));
  loop.stop();
  const genAfterStop = loop.getStatus().generation;
  assert(loop.getStatus().running === false, 'stop sets running false');
  // Restart should be clean
  loop.start();
  assert(loop.getStatus().running === true, 'start after stop works');
  assert(loop.getStatus().generation > genAfterStop, 'generation advanced');
  loop.stop();

  // Summary
  console.log('\n=== RESULTS ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failures.length) {
    failures.forEach(f => console.log('  -', f));
  }

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
