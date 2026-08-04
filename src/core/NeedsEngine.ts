import { NeedType, NeedState, NeedsSnapshot } from './types';

/** Numeric drive simulation only. It does not establish subjective awareness. */
export class NeedsEngine {
  private needs: Map<NeedType, NeedState> = new Map();
  private lastTick: number = Date.now();

  constructor() { this.initializeDefaults(); }

  private initializeDefaults() {
    const defaults: Array<[NeedType, number, number, number]> = [
      ['hunger', 20, 0.008, 45], ['thirst', 15, 0.012, 40],
      ['bladder', 10, 0.006, 55], ['energy', 25, 0.004, 50],
      ['hygiene', 15, 0.003, 60], ['social', 20, 0.002, 55],
      ['intimacy', 18, 0.0015, 60], ['comfort', 10, 0.001, 50],
      ['safety', 5, 0.0005, 40], ['curiosity', 30, 0.002, 50],
      ['purpose', 25, 0.001, 55],
    ];
    for (const [type, value, decay, aware] of defaults) {
      this.needs.set(type, {
        type, value, decayRate: decay, thresholdAware: aware,
        thresholdCritical: Math.min(95, aware + 30),
      });
    }
  }

  tick(now: number = Date.now()): NeedsSnapshot {
    const safeNow = Number.isFinite(now) ? Math.max(this.lastTick, now) : this.lastTick;
    const dt = Math.max(0, (safeNow - this.lastTick) / 1000);
    this.lastTick = safeNow;
    const snapshotNeeds: Record<NeedType, number> = {} as Record<NeedType, number>;
    const aware: NeedType[] = [];
    const critical: NeedType[] = [];
    for (const [type, state] of this.needs) {
      state.value = Math.min(100, state.value + state.decayRate * dt);
      snapshotNeeds[type] = state.value;
      if (state.value >= state.thresholdAware) aware.push(type);
      if (state.value >= state.thresholdCritical) critical.push(type);
    }
    return { timestamp: safeNow, needs: snapshotNeeds, awareSignals: aware, criticalSignals: critical };
  }

  applyDelta(type: NeedType, delta: number) {
    const state = this.needs.get(type);
    if (!state || !Number.isFinite(delta)) return;
    state.value = Math.max(0, Math.min(100, state.value + delta));
  }

  getNeed(type: NeedType): number { return this.needs.get(type)?.value ?? 0; }
  getSnapshot(): NeedsSnapshot { return this.tick(this.lastTick); }

  describeSignals(): string {
    const snap = this.getSnapshot();
    if (snap.awareSignals.length === 0) return 'Simulated need signals are below awareness thresholds.';
    return `Simulated need signals above threshold: ${snap.awareSignals.join(', ')}.`;
  }

  /** Backward-compatible neutral alias. */
  describeAwareness(): string { return this.describeSignals(); }
}
