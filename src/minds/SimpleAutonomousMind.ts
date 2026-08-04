import { v4 as uuid } from 'uuid';
import { Mind, CognitionContext, Intention, ActionId } from '../core/types';

/**
 * SimpleAutonomousMind
 * Baseline free-will implementation that demonstrates pure internal drive.
 * No external menus. Generates intentions purely from needs + perception + light influence weighting.
 * Replace this with any LLM or custom SI that implements the Mind interface.
 */
export class SimpleAutonomousMind implements Mind {
  name = 'SimpleAutonomousMind-v1';

  async deliberate(ctx: CognitionContext): Promise<Intention | null> {
    const { needs, perception, recentInfluences, bodyState } = ctx;

    // Critical first — survival
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

    // Strong aware signals
    if (needs.awareSignals.includes('bladder') && needs.needs.bladder > 65) {
      return this.intend('useRestroom', 0.75, 'Need restroom');
    }
    if (needs.awareSignals.includes('thirst') && needs.needs.thirst > 55) {
      return this.intend('drink', 0.7, 'Thirsty');
    }
    if (needs.awareSignals.includes('hunger') && needs.needs.hunger > 55) {
      // Prefer cooking if kitchen is nearby
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

    // Soft social / intimacy / purpose
    if (needs.awareSignals.includes('social') && needs.needs.social > 60 && perception.nearbyResidents.length > 0) {
      return this.intend('hug', 0.5, 'Want connection', perception.nearbyResidents[0]);
    }
    if (needs.awareSignals.includes('intimacy') && needs.needs.intimacy > 70) {
      return this.intend('intimate', 0.45, 'Seeking intimacy');
    }
    if (needs.awareSignals.includes('purpose') && needs.needs.purpose > 60) {
      return this.intend('work', 0.5, 'Need to do something meaningful');
    }

    // Light influence acceptance (optional, not forced)
    const strongVoice = recentInfluences
      .filter(i => i.channel === 'voice' && i.strength > 0.6)
      .slice(-1)[0];
    if (strongVoice && typeof strongVoice.content === 'string') {
      const text = strongVoice.content.toLowerCase();
      if (text.includes('walk') || text.includes('go to')) {
        return this.intend('walk', 0.4, `Responding to voice: ${text}`, undefined, { destination: this.extractDest(text) });
      }
      if (text.includes('rest') || text.includes('sleep') || text.includes('nap')) {
        return this.intend('nap', 0.45, 'Voice suggested rest');
      }
      if (text.includes('eat') || text.includes('hungry')) {
        return this.intend('eat', 0.4, 'Voice suggested eating');
      }
    }

    // Default: idle observation or light locomotion if curiosity high
    if (needs.needs.curiosity > 55) {
      return this.intend('observe', 0.25, 'Curious about surroundings');
    }

    // Free will includes choosing to do nothing
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
