import {
  Mind,
  CognitionContext,
  InfluenceEvent,
  Perception,
  ActionResult,
  DeliberationResult,
  INFLUENCE_TTL_MIN_MS,
  INFLUENCE_TTL_MAX_MS,
} from './types';
import { NeedsEngine } from './NeedsEngine';
import { ActionSystem } from './ActionSystem';

export type InfluenceIngestionStatus =
  | 'ACCEPTED'
  | 'REJECTED_DUPLICATE_PENDING'
  | 'REJECTED_PROCESSED'
  | 'REJECTED_CONSUMED'
  | 'REJECTED_MALFORMED'
  | 'REJECTED_WRONG_RESIDENT'
  | 'REJECTED_EXPIRED';

export interface InfluenceIngestionResult {
  status: InfluenceIngestionStatus;
  eventId: string;
}

/**
 * CognitionLoop — correction cycle 002
 */
export class CognitionLoop {
  private mind: Mind;
  private needs: NeedsEngine;
  private actions: ActionSystem;
  private influences: InfluenceEvent[] = [];
  private processedIds: Set<string> = new Set();
  private recentResults: ActionResult[] = [];
  private running = false;
  private generation = 0;
  private tickMs: number;
  private lastPerception: Perception;
  private residentId: string;
  private readonly MAX_PROCESSED = 200;
  private readonly MAX_QUEUE = 20;

  constructor(
    mind: Mind,
    needs: NeedsEngine,
    actions: ActionSystem,
    initialPerception: Perception,
    residentId: string,
    tickMs = 1500
  ) {
    this.mind = mind;
    this.needs = needs;
    this.actions = actions;
    this.lastPerception = initialPerception;
    this.residentId = residentId;
    this.tickMs = tickMs;
  }

  pushInfluence(event: InfluenceEvent): InfluenceIngestionResult {
    const id = event?.id ?? '';
    if (!id || typeof id !== 'string') {
      return { status: 'REJECTED_MALFORMED', eventId: id };
    }
    if (this.processedIds.has(id)) {
      return { status: 'REJECTED_PROCESSED', eventId: id };
    }
    if (this.influences.some(e => e.id === id)) {
      return { status: 'REJECTED_DUPLICATE_PENDING', eventId: id };
    }
    if (event.consumed) {
      return { status: 'REJECTED_CONSUMED', eventId: id };
    }

    const mal = this.validateEventShape(event);
    if (mal) return { status: mal, eventId: id };

    if (event.targetResidentId && event.targetResidentId !== this.residentId) {
      return { status: 'REJECTED_WRONG_RESIDENT', eventId: id };
    }

    if (event.expiresAt <= Date.now()) {
      return { status: 'REJECTED_EXPIRED', eventId: id };
    }

    this.influences.push({ ...event, consumed: false });
    if (this.influences.length > this.MAX_QUEUE) this.influences.shift();
    return { status: 'ACCEPTED', eventId: id };
  }

  private validateEventShape(event: InfluenceEvent): InfluenceIngestionStatus | null {
    if (!Number.isFinite(event.timestamp) || !Number.isFinite(event.expiresAt)) {
      return 'REJECTED_MALFORMED';
    }
    if (event.expiresAt < event.timestamp) return 'REJECTED_MALFORMED';
    const ttl = event.expiresAt - event.timestamp;
    if (ttl < INFLUENCE_TTL_MIN_MS || ttl > INFLUENCE_TTL_MAX_MS) {
      return 'REJECTED_MALFORMED';
    }
    if (event.strength !== undefined && (!Number.isFinite(event.strength) || event.strength < 0 || event.strength > 1)) {
      return 'REJECTED_MALFORMED';
    }
    if (event.confidence !== undefined && (!Number.isFinite(event.confidence) || event.confidence < 0 || event.confidence > 1)) {
      return 'REJECTED_MALFORMED';
    }
    if (!['voice', 'mouse', 'touch'].includes(event.channel)) {
      return 'REJECTED_MALFORMED';
    }
    return null;
  }

  updatePerception(p: Perception) {
    this.lastPerception = p;
  }

  start() {
    if (this.running) return;
    this.generation += 1;
    this.running = true;
    const myGeneration = this.generation;
    this.loop(myGeneration);
  }

  stop() {
    this.running = false;
    this.generation += 1;
  }

  private getActiveInfluences(): InfluenceEvent[] {
    const now = Date.now();
    this.influences = this.influences.filter(
      e => e.expiresAt > now && !e.consumed && !this.processedIds.has(e.id)
    );
    return [...this.influences];
  }

  private markProcessed(ids: string[]) {
    for (const id of ids) this.processedIds.add(id);
    if (this.processedIds.size > this.MAX_PROCESSED) {
      const arr = Array.from(this.processedIds);
      this.processedIds = new Set(arr.slice(arr.length - this.MAX_PROCESSED));
    }
  }

  /** Only IDs present in the exact active set may be accepted/rejected/deferred. Sets must be disjoint. */
  private sanitizeEnvelope(result: DeliberationResult, active: InfluenceEvent[]): DeliberationResult | null {
    const activeIds = new Set(active.map(e => e.id));
    const a = new Set(result.acceptedInfluenceIds || []);
    const r = new Set(result.rejectedInfluenceIds || []);
    const d = new Set(result.deferredInfluenceIds || []);

    // Reject foreign IDs
    for (const id of [...a, ...r, ...d]) {
      if (!activeIds.has(id)) return null;
    }
    // Disjoint
    for (const id of a) {
      if (r.has(id) || d.has(id)) return null;
    }
    for (const id of r) {
      if (d.has(id)) return null;
    }

    return {
      intention: result.intention,
      acceptedInfluenceIds: [...a],
      rejectedInfluenceIds: [...r],
      deferredInfluenceIds: [...d],
    };
  }

  private async loop(myGeneration: number) {
    while (this.running && this.generation === myGeneration) {
      const start = Date.now();
      const needsSnap = this.needs.tick();
      const activeInfluences = this.getActiveInfluences();

      const context: CognitionContext = {
        needs: needsSnap,
        perception: this.lastPerception,
        recentInfluences: activeInfluences,
        recentActions: [...this.recentResults].slice(-8),
        bodyState: this.actions.getBody(),
      };

      let result: DeliberationResult | null = null;
      try {
        result = await this.mind.deliberate(context);
      } catch (err) {
        console.error('[CognitionLoop] Mind error:', err);
      }

      if (!this.running || this.generation !== myGeneration) break;

      if (result) {
        const clean = this.sanitizeEnvelope(result, activeInfluences);
        if (clean) {
          const toConsume = [...clean.acceptedInfluenceIds, ...clean.rejectedInfluenceIds];
          for (const id of toConsume) {
            const ev = this.influences.find(e => e.id === id);
            if (ev) ev.consumed = true;
          }
          this.markProcessed(toConsume);

          if (clean.intention) {
            if (!this.running || this.generation !== myGeneration) break;
            const actionResult = await this.actions.execute(clean.intention);
            if (!this.running || this.generation !== myGeneration) break;

            this.recentResults.push(actionResult);
            if (this.recentResults.length > 30) this.recentResults.shift();

            if (actionResult.success && actionResult.newStateHints) {
              for (const [k, v] of Object.entries(actionResult.newStateHints)) {
                this.needs.applyDelta(k as any, v as number);
              }
            }
          }
        }
        // If envelope invalid (foreign IDs or overlap), discard entire result — no processing
      }

      const elapsed = Date.now() - start;
      await new Promise(r => setTimeout(r, Math.max(50, this.tickMs - elapsed)));
      if (!this.running || this.generation !== myGeneration) break;
    }
  }

  getStatus() {
    return {
      running: this.running,
      generation: this.generation,
      needs: this.needs.getSnapshot(),
      body: this.actions.getBody(),
      awareness: this.needs.describeAwareness(),
      pendingInfluences: this.getActiveInfluences().length,
      processedCount: this.processedIds.size,
      actionCount: this.actions.getActionCount(),
    };
  }
}
