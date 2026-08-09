import { Resident } from './core/Resident';
import { DeterministicBaselineMind } from './minds/DeterministicBaselineMind';
import { createVoiceInfluence } from './input/InfluenceChannels';

async function main() {
  console.log('=== NEXIA AUTONOMY QUARANTINED DONOR DEMO ===');
  console.log('Deterministic demonstration policy. No free-will, consciousness, personhood, or canonical integration claim.');
  console.log('This demo verifies bounded influence ingestion, cognition processing, and one completed donor-side walk state transition.\n');

  const resident = new Resident('Local donor resident', new DeterministicBaselineMind(), 'home');

  const event = createVoiceInfluence('walk', {
    targetResidentId: resident.id,
    provenance: 'local-demo',
    speakerId: 'local-demo-user',
    confidence: 0.99,
  }, 0.7, 5_000);

  const ingestion = resident.influence(event);
  console.log('Influence ingestion:', ingestion);
  if (ingestion.status !== 'ACCEPTED') throw new Error(`DEMO_INGESTION_FAILED:${ingestion.status}`);

  if (!resident.awaken()) throw new Error('DEMO_AWAKEN_FAILED');
  await new Promise((resolve) => setTimeout(resolve, 1_750));

  const processed = resident.status();
  console.log('Processed local status:', processed);
  if (processed.processedCount < 1 || processed.processedIntentionCount < 1 || processed.actionCount < 1) {
    throw new Error('DEMO_DID_NOT_PROCESS_ACCEPTED_INFLUENCE');
  }
  if (processed.body.location !== 'nearby') {
    throw new Error(`DEMO_WALK_DID_NOT_COMPLETE:${processed.body.location}`);
  }

  resident.sleep();
  const finalStatus = resident.status();
  console.log('Final local status:', finalStatus);
  console.log('Demo proof: bounded walk completed; location home -> nearby.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
