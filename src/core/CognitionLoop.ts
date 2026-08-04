import { Mind, CognitionContext, InfluenceEvent, Perception, ActionResult, DeliberationResult } from './types';
import { NeedsEngine } from './NeedsEngine';
import { ActionSystem } from './ActionSystem';

/**
 * CognitionLoop (correction cycle)
 *
 * - Generation token prevents overlapping loops and post-stop action.
 * - Only explicitly accepted or rejected influence IDs are consumed.
 * - Duplicate / replayed IDs are rejected via bounded processed ledger.
 * - Stale deliberation results after stop are discarded.
 */
export class CognitionLoop {
  private mind: Mind;
  private needs: NeedsEngine;
  private actions: ActionSystem;
  private influences: InfluenceEvent[] = [];
  private processedIds: Set<string> = new Set(); // bounded duplicate rejection
  private recentResults: ActionResult[] = [];
  private running = false;
  private generation = 0; // incremented on every start/stop
  private tickMs: number;
  private lastPerception: Perception;
  private readonly MAX_PROCESSED = 200;

  constructor(
    mind: Mind,
    needs: NeedsEngine,
    actions: ActionSystem,
    initialPerception: Perception,
    tickMs = 1500
  ) {
    this.mind = mind;
    this.needs = needs;
    this.actions = actions;
    this.lastPerception = initialPerception;
    this.tickMs = tickMs;
  }

  pushInfluence(event: InfluenceEvent) {
    // Reject duplicate / already-processed IDs (fail-closed)
    if (this.processedIds.has(event.id)) {
      return; // silent reject of replay
    }
    // Never accept an already-consumed event
    if (event.consumed) {
      return;
    }
    this.influences.push(event);
    if (this.influences.length > 20) this.influences.shift();
  }

  updatePerception(p: Perception) {
    this.lastPerception = p;
  }

  start() {
    if (this.running) return; // second concurrent loop prohibited
    this.generation += 1;
    this.running = true;
    const myGeneration = this.generation;
    this.loop(myGeneration);
  }

  stop() {
    this.running = false;
    this.generation += 1; // invalidate any in-flight deliberation
  }

  private getActiveInfluences(): InfluenceEvent[] {
    const now = Date.now();
    this.influences = this.influences.filter(
      e => e.expiresAt > now && !e.consumed && !this.processedIds.has(e.id)
    );
    return [...this.influences];
  }

  private markProcessed(ids: string[]) {
    for (const id of ids) {
      this.processedIds.add(id);
    }
    // Bound the ledger
    if (this.processedIds.size > this.MAX_PROCESSED) {
      const arr = Array.from(this.processedIds);
      this.processedIds = new Set(arr.slice(arr.length - this.MAX_PROCESSED));
    }
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

      // Recheck after deliberation — discard stale results
      if (!this.running || this.generation !== myGeneration) {
        break;
      }

      if (result) {
        // Consume only explicitly accepted or rejected IDs
        const toConsume = [
          ...result.acceptedInfluenceIds,
          ...result.rejectedInfluenceIds,
        ];
        for (const id of toConsume) {
          const ev = this.influences.find(e => e.id === id);
          if (ev) ev.consumed = true;
        }
        this.markProcessed(toConsume);
        // Deferred IDs remain available until expiration

        if (result.intention) {
          // Recheck before execution
          if (!this.running || this.generation !== myGeneration) {
            break;
          }

          const actionResult = await this.actions.execute(result.intention);

          // Recheck after execution before applying side effects
          if (!this.running || this.generation !== myGeneration) {
            break;
          }

          this.recentResults.push(actionResult);
          if (this.recentResults.length > 30) this.recentResults.shift();

          // Only apply need changes when the action actually succeeded
          // (NOT_IMPLEMENTED and FAILED do not mutate)
          if (actionResult.success && actionResult.newStateHints) {
            for (const [k, v] of Object.entries(actionResult.newStateHints)) {
              this.needs.applyDelta(k as any, v as number);
            }
          }
        }
      }

      const elapsed = Date.now() - start;
      const wait = Math.max(50, this.tickMs - elapsed);
      await new Promise(r => setTimeout(r, wait));

      // Final generation check before next iteration
      if (!this.running || this.generation !== myGeneration) {
        break;
      }
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
    };
  }
}
