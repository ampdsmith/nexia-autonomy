/**
 * Nexia Autonomy Donor Demo
 * Boots a single Resident with continuous cognition loop.
 * Demonstrates needs awareness, open deliberation, and optional expiring influence.
 *
 * Run: npm run demo
 */

import { Resident } from './core/Resident';
import { SimpleAutonomousMind } from './minds/SimpleAutonomousMind';
import { createVoiceInfluence } from './input/InfluenceChannels';

async function main() {
  console.log('=== NEXIA AUTONOMY DONOR DEMO ===');
  console.log('Open deliberation adapter active. No menus. No forced choices.\n');

  const mind = new SimpleAutonomousMind();
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
    console.log('\n>>> External voice influence: "Hey, maybe walk to the kitchen"');
    resident.influence(createVoiceInfluence('Hey, maybe walk to the kitchen', 0.7));
  }, 12000);

  setTimeout(() => {
    console.log('\n>>> External voice influence: "You look tired, rest if you want"');
    resident.influence(createVoiceInfluence('You look tired, rest if you want', 0.55));
  }, 28000);

  setTimeout(() => {
    clearInterval(statusInterval);
    resident.sleep();
    console.log('\n=== Demo complete. ===');
    process.exit(0);
  }, 45000);
}

main().catch(console.error);
