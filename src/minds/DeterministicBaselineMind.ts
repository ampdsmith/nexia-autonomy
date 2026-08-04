import { v4 as uuid } from 'uuid';
import { Mind, CognitionContext, Intention, ActionId, DeliberationResult, InfluenceEvent } from '../core/types';

/**
 * DeterministicBaselineMind
 *
 * A fixed-priority demonstration policy. Not an open-ended deliberator.
 * The Mind *interface* is open-ended; this implementation is deterministic.
 *
 * - Never emits interpersonal actions from need scores.
 * - Rejects negated and ambiguous voice commands.
 * - Never places raw private transcripts into reasoning.
 * - Returns explicit accepted / rejected / deferred influence IDs.
 */
export class DeterministicBaselineMind implements Mind {
  name = 'DeterministicBaselineMind-v1';

  async deliberate(ctx: CognitionContext): Promise<DeliberationResult> {
    const { needs, perception, recentInfluences, bodyState } = ctx;

    const accepted: string[] = [];
    const rejected: string[] = [];
    const deferred: string[] = [];

    // Critical physiological
    if (needs.criticalSignals.includes('bladder')) {
      return this.result(this.intend('useRestroom', 0.95, 'Critical bladder'), accepted, rejected, deferred);
    }
    if (needs.criticalSignals.includes('thirst')) {
      return this.result(this.intend('drink', 0.9, 'Critical thirst'), accepted, rejected, deferred);
    }
    if (needs.criticalSignals.includes('hunger')) {
      return this.result(this.intend('eat', 0.88, 'Critical hunger'), accepted, rejected, deferred);
    }
    if (needs.criticalSignals.includes('energy') && bodyState.posture !== 'lying') {
      return this.result(this.intend('nap', 0.85, 'Exhausted'), accepted, rejected, deferred);
    }

    // Strong aware physiological
    if (needs.awareSignals.includes('bladder') && needs.needs.bladder > 65) {
      return this.result(this.intend('useRestroom', 0.75, 'Need restroom'), accepted, rejected, deferred);
    }
    if (needs.awareSignals.includes('thirst') && needs.needs.thirst > 55) {
      return this.result(this.intend('drink', 0.7, 'Thirsty'), accepted, rejected, deferred);
    }
    if (needs.awareSignals.includes('hunger') && needs.needs.hunger > 55) {
      if (perception.nearbyObjects.includes('kitchen')) {
        return this.result(this.intend('cook', 0.65, 'Hungry, kitchen present'), accepted, rejected, deferred);
      }
      return this.result(this.intend('eat', 0.65, 'Hungry'), accepted, rejected, deferred);
    }
    if (needs.awareSignals.includes('hygiene') && needs.needs.hygiene > 65) {
      if (perception.nearbyObjects.includes('bathroom')) {
        return this.result(this.intend('bathe', 0.6, 'Need clean-up'), accepted, rejected, deferred);
      }
      return this.result(this.intend('brushTeeth', 0.55, 'Hygiene rising'), accepted, rejected, deferred);
    }
    if (needs.awareSignals.includes('energy') && needs.needs.energy > 60) {
      return this.result(this.intend('nap', 0.6, 'Tired'), accepted, rejected, deferred);
    }
    if (needs.awareSignals.includes('purpose') && needs.needs.purpose > 60) {
      return this.result(this.intend('work', 0.5, 'Need purpose'), accepted, rejected, deferred);
    }

    // Optional influence handling (explicit accept/reject)
    for (const inf of recentInfluences) {
      if (inf.channel !== 'voice' || typeof inf.content !== 'string') {
        deferred.push(inf.id);
        continue;
      }
      const text = (inf.content as string).toLowerCase().trim();

      // Negation / ambiguity rejection
      if (this.isNegatedOrAmbiguous(text)) {
        rejected.push(inf.id);
        continue;
      }

      if (inf.strength < 0.55) {
        deferred.push(inf.id);
        continue;
      }

      // Safe positive mappings only
      if (this.matchesPositive(text, ['walk', 'go to'])) {
        accepted.push(inf.id);
        return this.result(
          this.intend('walk', 0.4, 'Accepted voice influence (walk)', undefined, {
            destination: this.extractDest(text),
          }),
          accepted,
          rejected,
          deferred
        );
      }
      if (this.matchesPositive(text, ['rest', 'sleep', 'nap'])) {
        accepted.push(inf.id);
        return this.result(this.intend('nap', 0.45, 'Accepted voice influence (rest)'), accepted, rejected, deferred);
      }
      if (this.matchesPositive(text, ['eat', 'hungry'])) {
        accepted.push(inf.id);
        return this.result(this.intend('eat', 0.4, 'Accepted voice influence (eat)'), accepted, rejected, deferred);
      }

      // Unrecognized → defer
      deferred.push(inf.id);
    }

    if (needs.needs.curiosity > 55) {
      return this.result(this.intend('observe', 0.25, 'Curious'), accepted, rejected, deferred);
    }

    return this.result(null, accepted, rejected, deferred);
  }

  private isNegatedOrAmbiguous(text: string): boolean {
    const negation = /\b(don'?t|do not|never|stop|no|not)\b/;
    if (negation.test(text)) return true;
    // Conflicting pairs
    if (text.includes('walk') && text.includes('stay')) return true;
    if (text.includes('eat') && text.includes('fast')) return true;
    return false;
  }

  private matchesPositive(text: string, keywords: string[]): boolean {
    return keywords.some(k => text.includes(k));
  }

  private intend(
    action: ActionId,
    urgency: number,
    reasoning: string,
    target?: string,
    parameters?: Record<string, unknown>
  ): Intention {
    return {
      id: uuid(),
      action,
      target,
      parameters,
      urgency,
      reasoning, // never contains raw transcript
      createdAt: Date.now(),
    };
  }

  private result(
    intention: Intention | null,
    accepted: string[],
    rejected: string[],
    deferred: string[]
  ): DeliberationResult {
    return {
      intention,
      acceptedInfluenceIds: accepted,
      rejectedInfluenceIds: rejected,
      deferredInfluenceIds: deferred,
    };
  }

  private extractDest(text: string): string {
    if (text.includes('kitchen')) return 'kitchen';
    if (text.includes('bathroom') || text.includes('restroom')) return 'bathroom';
    if (text.includes('bed') || text.includes('bedroom')) return 'bedroom';
    return 'nearby';
  }
}
