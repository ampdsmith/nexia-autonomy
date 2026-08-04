import { Mind, CognitionContext, Intention, InfluenceEvent, Perception, ActionResult } from './types';
import { NeedsEngine } from './NeedsEngine';
import { ActionSystem } from './ActionSystem';

/**
 * CognitionLoop (hardened donor version)
 *
 * Continuously runs: perceive → feel needs → deliberate (via Mind) → form intention → act → feedback.
 * Never injects choice menus.
 * Influence events expire and are single-use. No indefinite replay.
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
    tickMs = 1500
  ) {
    this.mind = mind;
    this.needs = needs;
    this.actions = actions;
    this.lastPerception = initialPerception;
    this.tickMs = tickMs;
  }

  /** External systems push influence. Mind may ignore. Events expire. */
  pushInfluence(event: InfluenceEvent) {
    // Enforce required fields
    if (!event.expiresAt) {
      event.expiresAt = event.timestamp + 30_000; // default 30s if missing
    }
    event.consumed = false;
    this.influences.push(event);
    // Hard cap
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

  private getActiveInfluences(): InfluenceEvent[] {
    const now = Date.now();
    // Drop expired
    this.influences = this.influences.filter(e => e.expiresAt > now && !e.consumed);
    return [...this.influences];
  }

  private async loop() {
    while (this.running) {
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

      let intention: Intention | null = null;
      try {
        intention = await this.mind.deliberate(context);
      } catch (err) {
        console.error('[CognitionLoop] Mind error:', err);
      }

      if (intention) {
        const result = await this.actions.execute(intention);
        this.recentResults.push(result);
        if (this.recentResults.length > 30) this.recentResults.shift();

        if (result.success && result.newStateHints) {
          for (const [k, v] of Object.entries(result.newStateHints)) {
            this.needs.applyDelta(k as any, v as number);
          }
        }

        // Mark any influences the Mind may have considered as consumed
        // (simple policy: consume all active ones after an intention is formed)
        // A more precise Mind can later signal which ones it used.
        for (const inf of activeInfluences) {
          inf.consumed = true;
        }
      }

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
      pendingInfluences: this.getActiveInfluences().length,
    };
  }
}
