/**
 * Executable hardening tests for the donor.
 * Run with: npx ts-node src/tests/hardening.test.ts
 *
 * Required evidence format is produced by the runner at the bottom.
 */

import { validateExternalConsent } from '../core/ConsentBoundary';
import { ActionSystem } from '../core/ActionSystem';
import { SimpleAutonomousMind } from '../minds/SimpleAutonomousMind';
import { createVoiceInfluence } from '../input/InfluenceChannels';
import { BodyState, Intention } from '../core/types';
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

async function run() {
  console.log('=== NEXIA AUTONOMY DONOR HARDENING TESTS ===\n');

  // 1. Consent boundary is fail-closed
  console.log('ConsentBoundary');
  const noDecision = validateExternalConsent(null, 'intimate');
  assert(noDecision.allowed === false, 'null decision is not allowed');
  assert(noDecision.status === 'CONTRACT_PENDING', 'null decision returns CONTRACT_PENDING');

  const fakeDecision = {
    decisionId: 'fake',
    purpose: 'intimate',
    scope: 'test',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 60_000,
    revoked: false,
    paused: false,
    stopped: false,
    sos: false,
  };
  const withObject = validateExternalConsent(fakeDecision, 'intimate');
  assert(withObject.allowed === false, 'even a well-formed object is still CONTRACT_PENDING (no canonical integration)');
  assert(withObject.status === 'CONTRACT_PENDING', 'status remains CONTRACT_PENDING');

  // 2. ActionSystem blocks all interpersonal actions
  console.log('\nActionSystem interpersonal block');
  const body: BodyState = {
    location: 'home',
    posture: 'standing',
    clothing: ['basic'],
    energyLevel: 80,
    inventory: [],
  };
  const actions = new ActionSystem(body);

  for (const action of ['hug', 'touch', 'kiss', 'grab', 'intimate'] as const) {
    const intention: Intention = {
      id: uuid(),
      action,
      urgency: 0.5,
      createdAt: Date.now(),
    };
    const result = await actions.execute(intention);
    assert(result.success === false, `${action} is blocked`);
    assert(result.message.includes('FAIL-CLOSED') || result.message.includes('CONTRACT_PENDING'), `${action} reports fail-closed`);
  }

  // 3. SimpleAutonomousMind never emits interpersonal intentions from needs
  console.log('\nSimpleAutonomousMind no need-triggered intimacy');
  const mind = new SimpleAutonomousMind();
  const highIntimacyCtx = {
    needs: {
      timestamp: Date.now(),
      needs: {
        hunger: 10, thirst: 10, bladder: 10, energy: 10, hygiene: 10,
        social: 80, intimacy: 90, comfort: 10, safety: 5, curiosity: 20, purpose: 20,
      },
      awareSignals: ['social', 'intimacy'] as any,
      criticalSignals: [] as any,
    },
    perception: {
      timestamp: Date.now(),
      location: 'home',
      nearbyObjects: [],
      nearbyResidents: ['other-1'],
      environmentNotes: [],
    },
    recentInfluences: [],
    recentActions: [],
    bodyState: body,
  };
  const intention = await mind.deliberate(highIntimacyCtx);
  const badActions = ['hug', 'touch', 'kiss', 'grab', 'intimate'];
  assert(
    intention === null || !badActions.includes(intention.action),
    'Mind does not emit interpersonal action from high intimacy/social need'
  );

  // 4. Influence events expire and start unconsumed
  console.log('\nInfluence lifecycle');
  const voice = createVoiceInfluence('test', 0.7, 1000);
  assert(voice.consumed === false, 'new influence starts unconsumed');
  assert(voice.expiresAt > Date.now(), 'new influence has future expiration');
  assert(voice.expiresAt - voice.timestamp === 1000, 'TTL is respected');

  // Summary
  console.log('\n=== RESULTS ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failures.length) {
    console.log('Failures:');
    failures.forEach(f => console.log('  -', f));
  }

  // Required evidence block
  console.log('\n--- EVIDENCE BLOCK ---');
  console.log('test_command: npx ts-node src/tests/hardening.test.ts');
  console.log('runtime: node + ts-node');
  console.log(`total_tests: ${passed + failed}`);
  console.log(`pass: ${passed}`);
  console.log(`fail: ${failed}`);
  console.log(`skip: 0`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
