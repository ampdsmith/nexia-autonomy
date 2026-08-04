/**
 * Nexia Autonomy Donor Demo (correction cycle)
 * Run: npm run demo
 */

import { Resident } from './core/Resident';
import { DeterministicBaselineMind } from './minds/DeterministicBaselineMind';
import { createVoiceInfluence } from './input/InfluenceChannels';

async function main() {
  console.log('=== NEXIA AUTONOMY DONOR DEMO ===');
  console.log('Deterministic baseline policy. Open deliberation interface available.\n');

  const mind = new DeterministicBaselineMind();
  const resident = new Resident('Ava', mind, 'home');

  resident.awaken();

  const statusInterval = setInterval(() => {
    const s = resident.status();
    console.log(`\n[${new Date().toISOString().slice(11, 19)}] ${s.name}`);
    console.log(`  Awareness: ${s.awareness}`);
    console.log(`  Location: ${s.body.location} | Posture: ${s.body.posture}`);
    console.log(`  Top needs → hunger:${s.needs.needs.hunger.toFixed(1)} thirst:${s.needs.needs.thirst.toFixed(1)} energy:${s.needs.needs.energy.toFixed(1)} bladder:${s.needs.needs.bladder.toFixed(1)}`);
  }, 4000);

  setTimeout(() => {
    console.log('\n>>> Voice influence: "Hey, maybe walk to the kitchen"');
    resident.influence(createVoiceInfluence('Hey, maybe walk to the kitchen', 0.7));
  }, 12000);

  setTimeout(() => {
    console.log('\n>>> Voice influence (negated — should be rejected): "don\'t walk"');
    resident.influence(createVoiceInfluence("don't walk", 0.8));
  }, 20000);

  setTimeout(() => {
    clearInterval(statusInterval);
    resident.sleep();
    console.log('\n=== Demo complete. ===');
    process.exit(0);
  }, 35000);
}

main().catch(console.error);
