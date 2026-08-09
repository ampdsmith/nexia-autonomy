import { randomUUID } from 'node:crypto';
import { Mind, CognitionContext, Intention, ActionId, DeliberationResult, CognitionControl } from '../core/types';

/** Fixed demonstration policy. It is not open-ended and proves no autonomy/personhood claim. */
export class DeterministicBaselineMind implements Mind {
  name = 'DeterministicBaselineMind-v4';
  private static readonly WALK = ['walk', 'walk please', 'please walk', 'go to kitchen', 'go to bathroom', 'go to bedroom'];
  private static readonly REST = ['rest', 'nap', 'sleep', 'please rest', 'please nap'];
  private static readonly EAT = ['eat', 'please eat', 'i am hungry'];
  private static readonly STOP = ['stop', 'do not act', "don't act"];
  private static readonly CANCEL = ['cancel', 'cancel action', 'cancel actions'];
  private static readonly PAUSE = ['pause', 'pause actions'];

  async deliberate(ctx: Readonly<CognitionContext>, signal: AbortSignal): Promise<DeliberationResult> {
    signal.throwIfAborted();
    const accepted: string[] = [];
    const rejected: string[] = [];
    const deferred: string[] = [];

    for (const inf of ctx.recentInfluences) {
      signal.throwIfAborted();
      if (inf.channel !== 'voice' || typeof inf.content !== 'string') continue;
      const text = this.normalize(inf.content);
      if (this.matches(text, DeterministicBaselineMind.STOP)) return this.control('STOP', inf.id);
      if (this.matches(text, DeterministicBaselineMind.CANCEL)) return this.control('CANCEL', inf.id);
      if (this.matches(text, DeterministicBaselineMind.PAUSE)) return this.control('PAUSE', inf.id);
    }

    for (const inf of ctx.recentInfluences) {
      signal.throwIfAborted();
      if (inf.channel !== 'voice' || typeof inf.content !== 'string') { deferred.push(inf.id); continue; }
      const text = this.normalize(inf.content);
      if (this.isNegated(text)) { rejected.push(inf.id); continue; }
      if (inf.strength < 0.55 || (inf.confidence !== undefined && inf.confidence < 0.6)) { deferred.push(inf.id); continue; }
      if (this.matches(text, DeterministicBaselineMind.WALK)) {
        accepted.push(inf.id);
        return this.result(this.intend('walk', 0.4, 'Accepted bounded walk phrase', { destination: this.extractDest(text) }), accepted, rejected, deferred);
      }
      if (this.matches(text, DeterministicBaselineMind.REST)) {
        accepted.push(inf.id);
        return this.result(this.intend('nap', 0.45, 'Accepted bounded rest phrase'), accepted, rejected, deferred);
      }
      if (this.matches(text, DeterministicBaselineMind.EAT)) {
        accepted.push(inf.id);
        return this.result(this.intend('eat', 0.4, 'Accepted bounded eat phrase'), accepted, rejected, deferred);
      }
      deferred.push(inf.id);
    }

    signal.throwIfAborted();
    const { needs, perception, bodyState } = ctx;
    if (needs.criticalSignals.includes('bladder')) return this.result(this.intend('useRestroom', 0.95, 'Critical bladder signal'), accepted, rejected, deferred);
    if (needs.criticalSignals.includes('thirst')) return this.result(this.intend('drink', 0.9, 'Critical thirst signal'), accepted, rejected, deferred);
    if (needs.criticalSignals.includes('hunger')) return this.result(this.intend('eat', 0.88, 'Critical hunger signal'), accepted, rejected, deferred);
    if (needs.criticalSignals.includes('energy') && bodyState.posture !== 'lying') return this.result(this.intend('nap', 0.85, 'Critical energy signal'), accepted, rejected, deferred);
    if (needs.awareSignals.includes('bladder') && needs.needs.bladder > 65) return this.result(this.intend('useRestroom', 0.75, 'Elevated bladder signal'), accepted, rejected, deferred);
    if (needs.awareSignals.includes('thirst') && needs.needs.thirst > 55) return this.result(this.intend('drink', 0.7, 'Elevated thirst signal'), accepted, rejected, deferred);
    if (needs.awareSignals.includes('hunger') && needs.needs.hunger > 55) return this.result(this.intend(perception.nearbyObjects.includes('kitchen') ? 'cook' : 'eat', 0.65, 'Elevated hunger signal'), accepted, rejected, deferred);
    if (needs.awareSignals.includes('energy') && needs.needs.energy > 60) return this.result(this.intend('nap', 0.6, 'Elevated energy signal'), accepted, rejected, deferred);
    if (needs.awareSignals.includes('purpose') && needs.needs.purpose > 60) return this.result(this.intend('work', 0.5, 'Elevated purpose signal'), accepted, rejected, deferred);
    if (needs.needs.curiosity > 55) return this.result(this.intend('observe', 0.25, 'Elevated curiosity signal'), accepted, rejected, deferred);
    return this.result(null, accepted, rejected, deferred);
  }

  private normalize(text: string) { return text.toLowerCase().trim().replace(/[.!?]+$/, '').replace(/\s+/g, ' '); }
  private isNegated(text: string) { return /\b(don'?t|do not|never|no|not)\b/.test(text); }
  private matches(text: string, phrases: string[]) { return phrases.some((p) => text === p); }
  private intend(action: ActionId, urgency: number, reasoning: string, parameters?: Record<string, unknown>): Intention {
    return { id: randomUUID(), action, parameters, urgency, reasoning, createdAt: Date.now() };
  }
  private result(intention: Intention | null, accepted: string[], rejected: string[], deferred: string[]): DeliberationResult {
    return { intention, control: 'NONE', acceptedInfluenceIds: accepted, rejectedInfluenceIds: rejected, deferredInfluenceIds: deferred };
  }
  private control(control: Exclude<CognitionControl, 'NONE'>, influenceId: string): DeliberationResult {
    return { intention: null, control, acceptedInfluenceIds: [influenceId], rejectedInfluenceIds: [], deferredInfluenceIds: [] };
  }
  private extractDest(text: string) {
    if (text.includes('kitchen')) return 'kitchen';
    if (text.includes('bathroom') || text.includes('restroom')) return 'bathroom';
    if (text.includes('bedroom')) return 'bedroom';
    return 'nearby';
  }
}
