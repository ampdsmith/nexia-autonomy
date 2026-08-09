import {
  ACTION_IDS, Mind, CognitionContext, InfluenceEvent, Perception, ActionResult, DeliberationResult, Intention,
  CognitionControl, CognitionControlState,
  INFLUENCE_TTL_MIN_MS, INFLUENCE_TTL_MAX_MS, INFLUENCE_FUTURE_SKEW_MAX_MS,
  INFLUENCE_CONTENT_MAX_BYTES, INFLUENCE_PROVENANCE_MAX_LENGTH,
  INTENTION_MAX_AGE_MS, INTENTION_FUTURE_SKEW_MAX_MS, INTENTION_REASONING_MAX_LENGTH,
  INTENTION_PARAMETERS_MAX_BYTES,
} from './types';
import { NeedsEngine } from './NeedsEngine';
import { ActionSystem } from './ActionSystem';
import { DEFAULT_DONOR_REPLAY_LEDGER, ReplayLedger } from './ReplayLedger';

export type InfluenceIngestionStatus =
  | 'ACCEPTED' | 'REJECTED_DUPLICATE_PENDING' | 'REJECTED_REPLAY' | 'REJECTED_PROCESSED'
  | 'REJECTED_CONSUMED' | 'REJECTED_MALFORMED' | 'REJECTED_WRONG_RESIDENT'
  | 'REJECTED_EXPIRED' | 'REJECTED_FUTURE_TIMESTAMP' | 'REJECTED_QUEUE_FULL'
  | 'REJECTED_REPLAY_LEDGER_UNAVAILABLE';

export interface InfluenceIngestionResult { status: InfluenceIngestionStatus; eventId: string; }
export interface ResumeRequest {
  targetResidentId: string;
  actorId: string;
  authorityReference: string;
  requestedAt: number;
}
export type ControlAuthorizer = (request: Readonly<ResumeRequest>) => boolean | Promise<boolean>;

type IntentionValidation =
  | { ok: true; intention: Intention | null }
  | { ok: false; reason: string };

function clonePerception(p: Perception): Perception {
  return { timestamp: p.timestamp, location: p.location, nearbyObjects: [...p.nearbyObjects], nearbyResidents: [...p.nearbyResidents], environmentNotes: [...p.environmentNotes] };
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
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
function boundedOptionalString(value: unknown, max = 200): boolean {
  return value === undefined || (typeof value === 'string' && value.trim().length > 0 && value.length <= max);
}
function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

export class CognitionLoop {
  private influences: InfluenceEvent[] = [];
  private processedIds = new Set<string>();
  private seenInfluenceIds = new Set<string>();
  private processedIntentionIds = new Set<string>();
  private recentResults: ActionResult[] = [];
  private running = false;
  private generation = 0;
  private controlState: CognitionControlState = 'ACTIVE';
  private lastPerception: Perception;
  private lastBoundaryRejection: string | null = null;
  private readonly activeControllers = new Set<AbortController>();
  private readonly MAX_PROCESSED = 200;
  private readonly MAX_SEEN = 1_000;
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
    private readonly controlAuthorizer: ControlAuthorizer = () => false,
    private readonly replayLedger: ReplayLedger | null = DEFAULT_DONOR_REPLAY_LEDGER,
  ) {
    this.lastPerception = this.validateAndClonePerception(initialPerception);
    if (!residentId.trim()) throw new TypeError('residentId is required.');
  }

  pushInfluence(event: InfluenceEvent): InfluenceIngestionResult {
    const id = event?.id ?? '';
    if (!id || typeof id !== 'string' || id.length > 200) return { status: 'REJECTED_MALFORMED', eventId: id };
    if (this.influences.some((e) => e.id === id)) return { status: 'REJECTED_DUPLICATE_PENDING', eventId: id };
    if (this.seenInfluenceIds.has(id)) return { status: 'REJECTED_REPLAY', eventId: id };
    if (this.processedIds.has(id)) return { status: 'REJECTED_PROCESSED', eventId: id };
    if (event.consumed) return { status: 'REJECTED_CONSUMED', eventId: id };
    const malformed = this.validateEventShape(event);
    if (malformed) return { status: malformed, eventId: id };
    if (event.targetResidentId !== this.residentId) return { status: 'REJECTED_WRONG_RESIDENT', eventId: id };
    const now = Date.now();
    if (event.timestamp > now + INFLUENCE_FUTURE_SKEW_MAX_MS) return { status: 'REJECTED_FUTURE_TIMESTAMP', eventId: id };
    if (event.expiresAt <= now) return { status: 'REJECTED_EXPIRED', eventId: id };
    if (this.influences.length >= this.MAX_QUEUE) return { status: 'REJECTED_QUEUE_FULL', eventId: id };

    const replayClaim = this.claimReplayIdentity('influence', id);
    if (replayClaim === 'UNAVAILABLE') return { status: 'REJECTED_REPLAY_LEDGER_UNAVAILABLE', eventId: id };
    if (replayClaim === 'REPLAY') return { status: 'REJECTED_REPLAY', eventId: id };

    this.influences.push(cloneInfluence({ ...event, consumed: false }));
    this.seenInfluenceIds.add(id);
    this.trimSet(this.seenInfluenceIds, this.MAX_SEEN);
    return { status: 'ACCEPTED', eventId: id };
  }

  private claimReplayIdentity(kind: 'influence' | 'intention', id: string): 'ACCEPTED' | 'REPLAY' | 'UNAVAILABLE' {
    if (!this.replayLedger) return 'UNAVAILABLE';
    try { return this.replayLedger.claim(kind, this.residentId, id); }
    catch { return 'UNAVAILABLE'; }
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
    if (event.channel === 'voice') return typeof event.content === 'string' && event.content.trim() ? null : 'REJECTED_MALFORMED';
    if (event.channel === 'mouse') return this.validateMousePayload(event.content) ? null : 'REJECTED_MALFORMED';
    if (event.channel === 'touch') return this.validateTouchPayload(event.content) ? null : 'REJECTED_MALFORMED';
    return 'REJECTED_MALFORMED';
  }

  private validateMousePayload(content: unknown): boolean {
    if (!isPlainObject(content) || !hasOnlyKeys(content, ['x', 'y', 'targetObject', 'button'])) return false;
    if (!Number.isFinite(content.x) || !Number.isFinite(content.y)) return false;
    if (!boundedOptionalString(content.targetObject)) return false;
    return content.button === undefined || (Number.isInteger(content.button) && Number(content.button) >= 0 && Number(content.button) <= 5);
  }

  private validateTouchPayload(content: unknown): boolean {
    if (!isPlainObject(content) || !hasOnlyKeys(content, ['touches', 'gesture', 'targetObject'])) return false;
    if (!Array.isArray(content.touches) || content.touches.length < 1 || content.touches.length > 10) return false;
    if (!boundedOptionalString(content.gesture) || !boundedOptionalString(content.targetObject)) return false;
    const ids = new Set<number>();
    for (const point of content.touches) {
      if (!isPlainObject(point) || !hasOnlyKeys(point, ['id', 'x', 'y'])) return false;
      if (!Number.isInteger(point.id) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
      const id = Number(point.id);
      if (ids.has(id)) return false;
      ids.add(id);
    }
    return true;
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

  start(): boolean {
    if (this.running || this.controlState !== 'ACTIVE') return false;
    this.generation += 1;
    this.running = true;
    void this.loop(this.generation);
    return true;
  }

  stop({ clearPending = true, persistent = false }: { clearPending?: boolean; persistent?: boolean } = {}) {
    this.running = false;
    this.generation += 1;
    this.abortActiveOperations(new Error('COGNITION_STOPPED'));
    if (clearPending) this.influences = [];
    if (persistent) this.controlState = 'STOPPED';
  }

  async resume(request: ResumeRequest): Promise<boolean> {
    if (this.controlState === 'ACTIVE') return this.start();
    if (!request || request.targetResidentId !== this.residentId || typeof request.actorId !== 'string' || !request.actorId.trim()
        || typeof request.authorityReference !== 'string' || !request.authorityReference.trim()
        || !Number.isFinite(request.requestedAt) || Math.abs(Date.now() - request.requestedAt) > 30_000) return false;
    let authorized = false;
    try { authorized = await this.controlAuthorizer(freezeDeep({ ...request })); } catch { authorized = false; }
    if (!authorized) return false;
    this.controlState = 'ACTIVE';
    return this.start();
  }

  private suspendFromControl(control: Exclude<CognitionControl, 'NONE'>): void {
    this.controlState = control === 'PAUSE' ? 'PAUSED' : control === 'CANCEL' ? 'CANCELLED' : 'STOPPED';
    this.running = false;
    this.generation += 1;
    this.abortActiveOperations(new Error(`COGNITION_${this.controlState}`));
    this.influences = [];
  }

  private getActiveInfluences(): InfluenceEvent[] {
    const now = Date.now();
    this.influences = this.influences.filter((e) => e.expiresAt > now && !e.consumed && !this.processedIds.has(e.id));
    return this.influences.map(cloneInfluence);
  }

  private trimSet(set: Set<string>, max: number) {
    while (set.size > max) {
      const first = set.values().next().value as string | undefined;
      if (first === undefined) break;
      set.delete(first);
    }
  }

  private markProcessed(ids: string[]) {
    for (const id of ids) this.processedIds.add(id);
    this.trimSet(this.processedIds, this.MAX_PROCESSED);
  }

  private validateIntention(intention: Intention | null, now: number): IntentionValidation {
    if (intention === null) return { ok: true, intention: null };
    if (!intention || typeof intention.id !== 'string' || !intention.id.trim() || intention.id.length > 200) return { ok: false, reason: 'INVALID_INTENTION' };
    if (this.processedIntentionIds.has(intention.id)) return { ok: false, reason: 'INTENTION_REPLAY' };
    if (!ACTION_IDS.includes(intention.action)) return { ok: false, reason: 'INVALID_INTENTION' };
    if (!Number.isFinite(intention.urgency) || intention.urgency < 0 || intention.urgency > 1) return { ok: false, reason: 'INVALID_INTENTION' };
    if (!Number.isFinite(intention.createdAt) || intention.createdAt < now - INTENTION_MAX_AGE_MS || intention.createdAt > now + INTENTION_FUTURE_SKEW_MAX_MS) return { ok: false, reason: 'INVALID_INTENTION' };
    if (intention.target !== undefined && (typeof intention.target !== 'string' || !intention.target.trim() || intention.target.length > 200)) return { ok: false, reason: 'INVALID_INTENTION' };
    if (intention.reasoning !== undefined && (typeof intention.reasoning !== 'string' || intention.reasoning.length > INTENTION_REASONING_MAX_LENGTH)) return { ok: false, reason: 'INVALID_INTENTION' };
    if (intention.parameters !== undefined && byteLength(intention.parameters) > INTENTION_PARAMETERS_MAX_BYTES) return { ok: false, reason: 'INVALID_INTENTION' };

    const replayClaim = this.claimReplayIdentity('intention', intention.id);
    if (replayClaim === 'UNAVAILABLE') return { ok: false, reason: 'REPLAY_LEDGER_UNAVAILABLE' };
    if (replayClaim === 'REPLAY') return { ok: false, reason: 'INTENTION_REPLAY' };

    return { ok: true, intention: { ...intention, parameters: intention.parameters ? JSON.parse(JSON.stringify(intention.parameters)) : undefined } };
  }

  private rejectEnvelope(reason: string): null {
    this.lastBoundaryRejection = reason;
    return null;
  }

  private sanitizeEnvelope(result: DeliberationResult, active: InfluenceEvent[], now: number): DeliberationResult | null {
    if (!result || !Array.isArray(result.acceptedInfluenceIds) || !Array.isArray(result.rejectedInfluenceIds)
        || !Array.isArray(result.deferredInfluenceIds)) return this.rejectEnvelope('MALFORMED_DELIBERATION_ENVELOPE');
    const arrays = [result.acceptedInfluenceIds, result.rejectedInfluenceIds, result.deferredInfluenceIds];
    if (arrays.some((items) => new Set(items).size !== items.length)) return this.rejectEnvelope('DUPLICATE_DELIBERATION_IDS');
    const activeIds = new Set(active.map((e) => e.id));
    const a = new Set(result.acceptedInfluenceIds);
    const r = new Set(result.rejectedInfluenceIds);
    const d = new Set(result.deferredInfluenceIds);
    if ([...a, ...r, ...d].some((id) => typeof id !== 'string' || !activeIds.has(id))) return this.rejectEnvelope('FOREIGN_DELIBERATION_ID');
    for (const id of a) if (r.has(id) || d.has(id)) return this.rejectEnvelope('OVERLAPPING_DELIBERATION_IDS');
    for (const id of r) if (d.has(id)) return this.rejectEnvelope('OVERLAPPING_DELIBERATION_IDS');
    const control = result.control ?? 'NONE';
    if (!['NONE', 'PAUSE', 'STOP', 'CANCEL'].includes(control)) return this.rejectEnvelope('INVALID_CONTROL_RESULT');
    const validation = this.validateIntention(result.intention, now);
    if (!validation.ok) return this.rejectEnvelope(validation.reason);
    const intention = validation.intention;
    if (control !== 'NONE' && (intention !== null || a.size < 1)) return this.rejectEnvelope('INVALID_CONTROL_BINDING');
    this.lastBoundaryRejection = null;
    return { intention, control, acceptedInfluenceIds: [...a], rejectedInfluenceIds: [...r], deferredInfluenceIds: [...d] };
  }

  private abortActiveOperations(reason: Error): void {
    for (const controller of this.activeControllers) if (!controller.signal.aborted) controller.abort(reason);
  }

  private async withAbortBoundary<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number, label: string): Promise<T> {
    const controller = new AbortController();
    this.activeControllers.add(controller);
    let timer: NodeJS.Timeout | undefined;
    const operationPromise = Promise.resolve().then(() => operation(controller.signal));
    void operationPromise.catch(() => undefined);
    const abortPromise = new Promise<never>((_, reject) => {
      const rejectOnAbort = () => reject(controller.signal.reason instanceof Error ? controller.signal.reason : new Error(`${label}_ABORTED`));
      if (controller.signal.aborted) rejectOnAbort();
      else controller.signal.addEventListener('abort', rejectOnAbort, { once: true });
    });
    timer = setTimeout(() => controller.abort(new Error(`${label}_TIMEOUT`)), timeoutMs);
    try { return await Promise.race([operationPromise, abortPromise]); }
    finally {
      if (timer) clearTimeout(timer);
      this.activeControllers.delete(controller);
    }
  }

  private async loop(myGeneration: number) {
    while (this.running && this.generation === myGeneration && this.controlState === 'ACTIVE') {
      const start = Date.now();
      const context: CognitionContext = {
        needs: this.needs.tick(), perception: clonePerception(this.lastPerception),
        recentInfluences: this.getActiveInfluences(), recentActions: this.recentResults.slice(-8).map(cloneAction),
        bodyState: this.actions.getBody(),
      };
      let result: DeliberationResult | null = null;
      try { result = await this.withAbortBoundary((signal) => this.mind.deliberate(freezeDeep(context), signal), this.deliberationTimeoutMs, 'DELIBERATION'); }
      catch (err) { console.error('[CognitionLoop] Mind boundary:', err); }
      if (!this.running || this.generation !== myGeneration || this.controlState !== 'ACTIVE') break;

      if (result) {
        const clean = this.sanitizeEnvelope(result, context.recentInfluences, Date.now());
        if (clean) {
          const consumed = [...clean.acceptedInfluenceIds, ...clean.rejectedInfluenceIds];
          for (const id of consumed) {
            const event = this.influences.find((e) => e.id === id);
            if (event) event.consumed = true;
          }
          this.markProcessed(consumed);
          if (clean.control && clean.control !== 'NONE') {
            this.suspendFromControl(clean.control);
            break;
          }
          if (clean.intention) {
            this.processedIntentionIds.add(clean.intention.id);
            this.trimSet(this.processedIntentionIds, this.MAX_INTENTIONS);
            try {
              const actionResult = await this.withAbortBoundary((signal) => this.actions.execute(clean.intention as Intention, signal), this.actionTimeoutMs, 'ACTION');
              if (!this.running || this.generation !== myGeneration || this.controlState !== 'ACTIVE') break;
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
      controlState: this.controlState,
      needs: this.needs.getSnapshot(),
      body: this.actions.getBody(),
      needSignals: this.needs.describeSignals(),
      pendingInfluences: this.getActiveInfluences().length,
      processedCount: this.processedIds.size,
      seenInfluenceCount: this.seenInfluenceIds.size,
      processedIntentionCount: this.processedIntentionIds.size,
      actionCount: this.actions.getActionCount(),
      lastBoundaryRejection: this.lastBoundaryRejection,
      activeOperationCount: this.activeControllers.size,
      replayLedgerAvailable: this.replayLedger !== null,
    };
  }
}
