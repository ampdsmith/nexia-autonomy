import { v4 as uuid } from 'uuid';
import { Mind, CognitionContext, Intention, ActionId } from '../core/types';

/**
 * SimpleAutonomousMind (hardened donor version)
 *
 * Baseline open-ended deliberation adapter.
 * Generates intentions from needs + perception + optional influence.
 * Internal desire / need scores never authorize hug, touch, kiss, grab, or intimate.
 * Those actions are blocked at the ActionSystem boundary until a canonical external consent decision exists.
 *
 * This implementation demonstrates autonomous decision policy.
 * It does not prove free will, consciousness, or personhood.
 */
export class SimpleAutonomousMind implements Mind {
  name = 'SimpleAutonomousMind-v1-hardened';

  async deliberate(ctx: CognitionContext): Promise<Intention | null> {
    const { needs, perception, recentInfluences, bodyState } = ctx;

    // Critical physiological first
    if (needs.criticalSignals.includes('bladder')) {
      return this.intend('useRestroom', 0.95, 'Critical bladder pressure');
    }
    if (needs.criticalSignals.includes('thirst')) {
      return this.intend('drink', 0.9, 'Critical thirst');
    }
    if (needs.criticalSignals.includes('hunger')) {
      return this.intend('eat', 0.88, 'Critical hunger');
    }
    if (needs.criticalSignals.includes('energy') && bodyState.posture !== 'lying') {
      return this.intend('nap', 0.85, 'Exhausted');
    }

    // Strong aware physiological signals
    if (needs.awareSignals.includes('bladder') && needs.needs.bladder > 65) {
      return this.intend('useRestroom', 0.75, 'Need restroom');
    }
    if (needs.awareSignals.includes('thirst') && needs.needs.thirst > 55) {
      return this.intend('drink', 0.7, 'Thirsty');
    }
    if (needs.awareSignals.includes('hunger') && needs.needs.hunger > 55) {
      if (perception.nearbyObjects.includes('kitchen')) {
        return this.intend('cook', 0.65, 'Hungry and kitchen available');
      }
      return this.intend('eat', 0.65, 'Hungry');
    }
    if (needs.awareSignals.includes('hygiene') && needs.needs.hygiene > 65) {
      if (perception.nearbyObjects.includes('bathroom')) {
        return this.intend('bathe', 0.6, 'Need to clean up');
      }
      return this.intend('brushTeeth', 0.55, 'Hygiene rising');
    }
    if (needs.awareSignals.includes('energy') && needs.needs.energy > 60) {
      return this.intend('nap', 0.6, 'Tired');
    }

    // Purpose / work — non-interpersonal
    if (needs.awareSignals.includes('purpose') && needs.needs.purpose > 60) {
      return this.intend('work', 0.5, 'Need to do something meaningful');
    }

    // Optional light influence acceptance (never forced)
    const strongVoice = recentInfluences
      .filter(i => i.channel === 'voice' && i.strength > 0.6 && !i.consumed)
      .slice(-1)[0];
    if (strongVoice && typeof strongVoice.content === 'string') {
      const text = strongVoice.content.toLowerCase();
      if (text.includes('walk') || text.includes('go to')) {
        return this.intend('walk', 0.4, `Responding to voice: ${text}`, undefined, {
          destination: this.extractDest(text),
        });
      }
      if (text.includes('rest') || text.includes('sleep') || text.includes('nap')) {
        return this.intend('nap', 0.45, 'Voice suggested rest');
      }
      if (text.includes('eat') || text.includes('hungry')) {
        return this.intend('eat', 0.4, 'Voice suggested eating');
      }
    }

    // Curiosity → observe only
    if (needs.needs.curiosity > 55) {
      return this.intend('observe', 0.25, 'Curious about surroundings');
    }

    // Choosing to do nothing is valid
    return null;
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
      reasoning,
      createdAt: Date.now(),
    };
  }

  private extractDest(text: string): string {
    if (text.includes('kitchen')) return 'kitchen';
    if (text.includes('bathroom') || text.includes('restroom')) return 'bathroom';
    if (text.includes('bed') || text.includes('bedroom')) return 'bedroom';
    return 'nearby';
  }
}
