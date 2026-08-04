import { Resident } from './core/Resident';
import { DeterministicBaselineMind } from './minds/DeterministicBaselineMind';
import { createVoiceInfluence } from './input/InfluenceChannels';

async function main() {
  console.log('=== NEXIA AUTONOMY QUARANTINED DONOR DEMO ===');
  console.log('Deterministic demonstration policy. No free-will, consciousness, personhood, or canonical integration claim.\n');

  const resident = new Resident('Local donor resident', new DeterministicBaselineMind(), 'home');
  resident.awaken();

  const event = createVoiceInfluence('walk', {
    targetResidentId: resident.id,
    provenance: 'local-demo',
    speakerId: 'local-demo-user',
    confidence: 0.99,
  }, 0.7, 5_000);

  console.log('Influence ingestion:', resident.influence(event));
  await new Promise((resolve) => setTimeout(resolve, 250));
  resident.sleep();
  console.log('Final local status:', resident.status());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
