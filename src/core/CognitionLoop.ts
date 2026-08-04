import {
  ACTION_IDS, Mind, CognitionContext, InfluenceEvent, Perception, ActionResult, DeliberationResult, Intention,
  INFLUENCE_TTL_MIN_MS, INFLUENCE_TTL_MAX_MS, INFLUENCE_FUTURE_SKEW_MAX_MS,
  INFLUENCE_CONTENT_MAX_BYTES, INFLUENCE_PROVENANCE_MAX_LENGTH,
  INTENTION_MAX_AGE_MS, INTENTION_FUTURE_SKEW_MAX_MS, INTENTION_REASONING_MAX_LENGTH,
  INTENTION_PARAMETERS_MAX_BYTES,
} from './types';
import { NeedsEngine } from './NeedsEngine';
import { ActionSystem } from './ActionSystem';

export type InfluenceIngestionStatus =
  | 'ACCEPTED' | 'REJECTED_DUPLICATE_PENDING' | 'REJECTED_PROCESSED'
  | 'REJECTED_CONSUMED' | 'REJECTED_MALFORMED' | 'REJECTED_WRONG_RESIDENT'
  | 'REJECTED_EXPIRED' | 'REJECTED_FUTURE_TIMESTAMP' | 'REJECTED_QUEUE_FULL';

export interface InfluenceIngestionResult { status: InfluenceIngestionStatus; eventId: string; }

function clonePerception(p: Perception): Perception {
  return {
    timestamp: p.timestamp,
    location: p.location,
    nearbyObjects: [...p.nearbyObjects],
    nearbyResidents: [...p.nearbyResidents],
    environmentNotes: [...p.environmentNotes],
  };
}
function cloneInfluence(event: InfluenceEvent): InfluenceEvent {
  return { ...event, content: typeof event.content === 'string' ? event.content : JSON.parse(JSON.stringify(event.content)) };
}
function cloneAction(result: ActionResult): ActionResult {
  return { ...result, newStateHints: result.newStateHints ? { ...result.newStateHints } : undefined };
}
function freezeDeep<T>(value: T): Readonly<T> {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const item of Object.values(value as Record<string, unknown>)) freezeDeep(item);
  return value;
}
function byteLength(value: unknown): number {
  try { return Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value), 'utf8'); }
  catch { return Number.POSITIVE_INFINITY; }
}

export class CognitionLoop {
  private influences: InfluenceEvent[] = [];
  private processedIds = new Set<string>();
  private processedIntentionIds = new Set<string>();
  private recentResults: ActionResult[] = [];
  private running = false;
  private generation = 0;
  private lastPerception: Perception;
  private readonly MAX_PROCESSED = 200;
  private readonly MAX_QUEUE = 20;
  private readonly MAX_INTENTIONS = 200;

  constructor(
    private readonly mind: Mind,
    private readonly needs: NeedsEngine,
    private readonly actions: ActionSystem,
    initialPerception: Perception,
    private readonly residentId: string,
    private readonly tickMs = 1500,
    private readonly deliberationTimeoutMs = 1_000,
    private readonly actionTimeoutMs = 1_000,
  ) {
    this.lastPerception = this.validateAndClonePerception(initialPerception);
    if (!residentId.trim()) throw new TypeError('residentId is required.');
  }

  pushInfluence(event: InfluenceEvent): InfluenceIngestionResult {
    const id = event?.id ?? '';
    if (!id || typeof id !== 'string' || id.length > 200) return { status: 'REJECTED_MALFORMED', eventId: id };
    if (this.processedIds.has(id)) return { status: 'REJECTED_PROCESSED', eventId: id };
    if (this.influences.some((e) => e.id === id)) return { status: 'REJECTED_DUPLICATE_PENDING', eventId: id };
    if (event.consumed) return { status: 'REJECTED_CONSUMED', eventId: id };
    const malformed = this.validateEventShape(event);
    if (malformed) return { status: malformed, eventId: id };
    if (event.targetResidentId !== this.residentId) return { status: 'REJECTED_WRONG_RESIDENT', eventId: id };
    const now = Date.now();
    if (event.timestamp > now + INFLUENCE_FUTURE_SKEW_MAX_MS) return { status: 'REJECTED_FUTURE_TIMESTAMP', eventId: id };
    if (event.expiresAt <= now) return { status: 'REJECTED_EXPIRED', eventId: id };
    if (this.influences.length >= this.MAX_QUEUE) return { status: 'REJECTED_QUEUE_FULL', eventId: id };
    this.influences.push(cloneInfluence({ ...event, consumed: false }));
    return { status: 'ACCEPTED', eventId: id };
  }

  private validateEventShape(event: InfluenceEvent): InfluenceIngestionStatus | null {
    if (!Number.isFinite(event.timestamp) || !Number.isFinite(event.expiresAt) || event.expiresAt < event.timestamp) return 'REJECTED_MALFORMED';
    const ttl = event.expiresAt - event.timestamp;
    if (ttl < INFLUENCE_TTL_MIN_MS || ttl > INFLUENCE_TTL_MAX_MS) return 'REJECTED_MALFORMED';
    if (!Number.isFinite(event.strength) || event.strength < 0 || event.strength > 1) return 'REJECTED_MALFORMED';
    if (event.confidence !== undefined && (!Number.isFinite(event.confidence) || event.confidence < 0 || event.confidence > 1)) return 'REJECTED_MALFORMED';
    if (!['voice', 'mouse', 'touch'].includes(event.channel)) return 'REJECTED_MALFORMED';
    if (typeof event.targetResidentId !== 'string' || !event.targetResidentId.trim() || event.targetResidentId.length > 200) return 'REJECTED_MALFORMED';
    if (typeof event.provenance !== 'string' || !event.provenance.trim() || event.provenance.length > INFLUENCE_PROVENANCE_MAX_LENGTH) return 'REJECTED_MALFORMED';
    if (byteLength(event.content) === 0 || byteLength(event.content) > INFLUENCE_CONTENT_MAX_BYTES) return 'REJECTED_MALFORMED';
    if (event.channel === 'voice' && (typeof event.content !== 'string' || !event.content.trim())) return 'REJECTED_MALFORMED';
    return null;
  }

  updatePerception(p: Perception) { this.lastPerception = this.validateAndClonePerception(p); }

  private validateAndClonePerception(p: Perception): Perception {
    if (!p || !Number.isFinite(p.timestamp) || typeof p.location !== 'string' || !p.location.trim()
        || !Array.isArray(p.nearbyObjects) || !Array.isArray(p.nearbyResidents) || !Array.isArray(p.environmentNotes)) {
      throw new TypeError('Perception is malformed.');
    }
    const all = [...p.nearbyObjects, ...p.nearbyResidents, ...p.environmentNotes];
    if (all.length > 300 || all.some((v) => typeof v !== 'string' || v.length > 500)) throw new TypeError('Perception exceeds bounded limits.');
    return clonePerception(p);
  }

  start() {
    if (this.running) return;
    this.generation += 1;
    this.running = true;
    void this.loop(this.generation);
  }

  stop({ clearPending = true }: { clearPending?: boolean } = {}) {
    this.running = false;
    this.generation += 1;
    if (clearPending) this.influences = [];
  }

  private getActiveInfluences(): InfluenceEvent[] {
    const now = Date.now();
    this.influences = this.influences.filter((e) => e.expiresAt > now && !e.consumed && !this.processedIds.has(e.id));
    return this.influences.map(cloneInfluence);
  }

  private trimSet(set: Set<string>, max: number) {
    if (set.size <= max) return;
    const values = Array.from(set);
    set.clear();
    for (const id of values.slice(values.length - max)) set.add(id);
  }

  private markProcessed(ids: string[]) {
    for (const id of ids) this.processedIds.add(id);
    this.trimSet(this.processedIds, this.MAX_PROCESSED);
  }

  private validateIntention(intention: Intention | null, now: number): Intention | null | false {
    if (intention === null) return null;
    if (!intention || typeof intention.id !== 'string' || !intention.id.trim() || intention.id.length > 200) return false;
    if (this.processedIntentionIds.has(intention.id) || !ACTION_IDS.includes(intention.action)) return false;
    if (!Number.isFinite(intention.urgency) || intention.urgency < 0 || intention.urgency > 1) return false;
    if (!Number.isFinite(intention.createdAt) || intention.createdAt < now - INTENTION_MAX_AGE_MS || intention.createdAt > now + INTENTION_FUTURE_SKEW_MAX_MS) return false;
    if (intention.target !== undefined && (typeof intention.target !== 'string' || !intention.target.trim() || intention.target.length > 200)) return false;
    if (intention.reasoning !== undefined && (typeof intention.reasoning !== 'string' || intention.reasoning.length > INTENTION_REASONING_MAX_LENGTH)) return false;
    if (intention.parameters !== undefined && byteLength(intention.parameters) > INTENTION_PARAMETERS_MAX_BYTES) return false;
    return { ...intention, parameters: intention.parameters ? JSON.parse(JSON.stringify(intention.parameters)) : undefined };
  }

  private sanitizeEnvelope(result: DeliberationResult, active: InfluenceEvent[], now: number): DeliberationResult | null {
    if (!result || !Array.isArray(result.acceptedInfluenceIds) || !Array.isArray(result.rejectedInfluenceIds)
        || !Array.isArray(result.deferredInfluenceIds)) return null;
    const activeIds = new Set(active.map((e) => e.id));
    const a = new Set(result.acceptedInfluenceIds);
    const r = new Set(result.rejectedInfluenceIds);
    const d = new Set(result.deferredInfluenceIds);
    if ([...a, ...r, ...d].some((id) => typeof id !== 'string' || !activeIds.has(id))) return null;
    for (const id of a) if (r.has(id) || d.has(id)) return null;
    for (const id of r) if (d.has(id)) return null;
    const intention = this.validateIntention(result.intention, now);
    if (intention === false) return null;
    return { intention, acceptedInfluenceIds: [...a], rejectedInfluenceIds: [...r], deferredInfluenceIds: [...d] };
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), timeoutMs); }),
      ]);
    } finally { if (timer) clearTimeout(timer); }
  }

  private async loop(myGeneration: number) {
    while (this.running && this.generation === myGeneration) {
      const start = Date.now();
      const context: CognitionContext = {
        needs: this.needs.tick(),
        perception: clonePerception(this.lastPerception),
        recentInfluences: this.getActiveInfluences(),
        recentActions: this.recentResults.slice(-8).map(cloneAction),
        bodyState: this.actions.getBody(),
      };
      let result: DeliberationResult | null = null;
      try { result = await this.withTimeout(this.mind.deliberate(freezeDeep(context)), this.deliberationTimeoutMs, 'DELIBERATION'); }
      catch (err) { console.error('[CognitionLoop] Mind boundary:', err); }
      if (!this.running || this.generation !== myGeneration) break;

      if (result) {
        const clean = this.sanitizeEnvelope(result, context.recentInfluences, Date.now());
        if (clean) {
          const consumed = [...clean.acceptedInfluenceIds, ...clean.rejectedInfluenceIds];
          for (const id of consumed) {
            const event = this.influences.find((e) => e.id === id);
            if (event) event.consumed = true;
          }
          this.markProcessed(consumed);
          if (clean.intention) {
            this.processedIntentionIds.add(clean.intention.id);
            this.trimSet(this.processedIntentionIds, this.MAX_INTENTIONS);
            try {
              const actionResult = await this.withTimeout(this.actions.execute(clean.intention), this.actionTimeoutMs, 'ACTION');
              if (!this.running || this.generation !== myGeneration) break;
              this.recentResults.push(cloneAction(actionResult));
              if (this.recentResults.length > 30) this.recentResults.shift();
              if (actionResult.success && actionResult.newStateHints) {
                for (const [key, value] of Object.entries(actionResult.newStateHints)) this.needs.applyDelta(key as any, value as number);
              }
            } catch (err) { console.error('[CognitionLoop] Action boundary:', err); }
          }
        }
      }
      const elapsed = Date.now() - start;
      await new Promise((resolve) => setTimeout(resolve, Math.max(50, this.tickMs - elapsed)));
    }
  }

  getStatus() {
    return {
      running: this.running,
      generation: this.generation,
      needs: this.needs.getSnapshot(),
      body: this.actions.getBody(),
      needSignals: this.needs.describeSignals(),
      pendingInfluences: this.getActiveInfluences().length,
      processedCount: this.processedIds.size,
      processedIntentionCount: this.processedIntentionIds.size,
      actionCount: this.actions.getActionCount(),
    };
  }
}
