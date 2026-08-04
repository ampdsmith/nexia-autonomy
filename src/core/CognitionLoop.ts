import { v4 as uuid } from 'uuid';
import { Mind, CognitionContext, Intention, InfluenceEvent, Perception, NeedsSnapshot, BodyState, ActionResult } from './types';
import { NeedsEngine } from './NeedsEngine';
import { ActionSystem } from './ActionSystem';

/**
 * CognitionLoop
 * The heart of free will.
 * Continuously runs: perceive → feel needs → deliberate (via Mind) → form intention → act → feedback.
 * Never injects choice menus. The Mind generates its own intention or chooses to do nothing.
 */
export class CognitionLoop {
  private mind: Mind;
  private needs: NeedsEngine;
  private actions: ActionSystem;
  private influences: InfluenceEvent[] = [];
  private recentResults: ActionResult[] = [];
  private running = false;
  private tickMs: number;
  private lastPerception: Perception;

  constructor(
    mind: Mind,
    needs: NeedsEngine,
    actions: ActionSystem,
    initialPerception: Perception,
    tickMs = 1500 // real-time but not thrashing
  ) {
    this.mind = mind;
    this.needs = needs;
    this.actions = actions;
    this.lastPerception = initialPerception;
    this.tickMs = tickMs;
  }

  /** External systems push influence. Mind may ignore. */
  pushInfluence(event: InfluenceEvent) {
    this.influences.push(event);
    // Keep only recent window
    if (this.influences.length > 20) this.influences.shift();
  }

  updatePerception(p: Perception) {
    this.lastPerception = p;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  stop() {
    this.running = false;
  }

  private async loop() {
    while (this.running) {
      const start = Date.now();

      // 1. Feel
      const needsSnap = this.needs.tick();

      // 2. Build context (no forced options)
      const context: CognitionContext = {
        needs: needsSnap,
        perception: this.lastPerception,
        recentInfluences: [...this.influences],
        recentActions: [...this.recentResults].slice(-8),
        bodyState: this.actions.getBody(),
      };

      // 3. Free deliberation
      let intention: Intention | null = null;
      try {
        intention = await this.mind.deliberate(context);
      } catch (err) {
        console.error('[CognitionLoop] Mind error:', err);
      }

      // 4. Act if intention formed
      if (intention) {
        const result = await this.actions.execute(intention);
        this.recentResults.push(result);
        if (this.recentResults.length > 30) this.recentResults.shift();

        // Apply need changes from successful actions
        if (result.success && result.newStateHints) {
          for (const [k, v] of Object.entries(result.newStateHints)) {
            this.needs.applyDelta(k as any, v as number);
          }
        }

        // Optional: clear consumed influences if mind acted on them
        // (left to Mind implementation whether to reference them)
      }

      // 5. Pace the loop
      const elapsed = Date.now() - start;
      const wait = Math.max(50, this.tickMs - elapsed);
      await new Promise(r => setTimeout(r, wait));
    }
  }

  getStatus() {
    return {
      running: this.running,
      needs: this.needs.getSnapshot(),
      body: this.actions.getBody(),
      awareness: this.needs.describeAwareness(),
      pendingInfluences: this.influences.length,
    };
  }
}
