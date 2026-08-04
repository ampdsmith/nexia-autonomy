/**
 * Nexia Autonomy Demo
 * Boots a single Resident with continuous free-will loop.
 * Demonstrates needs awareness, autonomous decision making,
 * and optional voice-style influence (simulated here).
 *
 * Run: npm run demo
 */

import { Resident } from './core/Resident';
import { SimpleAutonomousMind } from './minds/SimpleAutonomousMind';
import { InfluenceEvent } from './core/types';
import { v4 as uuid } from 'uuid';

async function main() {
  console.log('=== NEXIA AUTONOMY DEMO ===');
  console.log('Free will engine online. No menus. No forced choices.\n');

  const mind = new SimpleAutonomousMind();
  const resident = new Resident('Ava', mind, 'home');

  resident.awaken();

  // Status reporter every 4 seconds
  const statusInterval = setInterval(() => {
    const s = resident.status();
    console.log(`\n[${new Date().toISOString().slice(11, 19)}] ${s.name}`);
    console.log(`  Awareness: ${s.awareness}`);
    console.log(`  Location: ${s.body.location} | Posture: ${s.body.posture}`);
    console.log(`  Top needs → hunger:${s.needs.needs.hunger.toFixed(1)} thirst:${s.needs.needs.thirst.toFixed(1)} energy:${s.needs.needs.energy.toFixed(1)} bladder:${s.needs.needs.bladder.toFixed(1)}`);
  }, 4000);

  // Simulate occasional external voice influence (never forced)
  setTimeout(() => {
    console.log('\n>>> External voice influence: "Hey, maybe walk to the kitchen"');
    const event: InfluenceEvent = {
      id: uuid(),
      channel: 'voice',
      content: 'Hey, maybe walk to the kitchen',
      timestamp: Date.now(),
      strength: 0.7,
    };
    resident.influence(event);
  }, 12000);

  setTimeout(() => {
    console.log('\n>>> External voice influence: "You look tired, rest if you want"');
    resident.influence({
      id: uuid(),
      channel: 'voice',
      content: 'You look tired, rest if you want',
      timestamp: Date.now(),
      strength: 0.55,
    });
  }, 28000);

  // Run for ~45 seconds then shut down cleanly
  setTimeout(() => {
    clearInterval(statusInterval);
    resident.sleep();
    console.log('\n=== Demo complete. Resident remains fully autonomous when awakened again. ===');
    process.exit(0);
  }, 45000);
}

main().catch(console.error);
