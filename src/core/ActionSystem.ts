import { ACTION_IDS, Intention, ActionResult, BodyState, ActionLifecycle } from './types';
import { validateExternalConsent, ExternalConsentDecision } from './ConsentBoundary';

function cloneBody(body: BodyState): BodyState {
  return { ...body, clothing: [...body.clothing], inventory: [...body.inventory] };
}

export class ActionSystem {
  private body: BodyState;
  private actionCount = 0;

  constructor(initialBody: BodyState, private readonly residentId: string) {
    this.body = cloneBody(initialBody);
  }

  getBody(): BodyState { return cloneBody(this.body); }
  getActionCount(): number { return this.actionCount; }

  async execute(intention: Intention): Promise<ActionResult> {
    this.actionCount += 1;
    if (!intention || !ACTION_IDS.includes(intention.action)) {
      return this.fail(intention?.id ?? 'unknown', 'FAILED', 'Invalid action request.');
    }
    const { action } = intention;
    if (this.body.posture === 'falling' && action !== 'getUp') {
      return this.fail(intention.id, 'FAILED', 'Cannot perform action while falling.');
    }

    switch (action) {
      case 'fall': this.body.posture = 'falling'; return this.ok(intention.id, 'COMPLETED', 'Fell.');
      case 'getUp':
        if (this.body.posture === 'falling' || this.body.posture === 'lying') {
          this.body.posture = 'standing';
          return this.ok(intention.id, 'COMPLETED', 'Got back up.');
        }
        return this.fail(intention.id, 'FAILED', 'Already upright.');
      case 'idle':
      case 'observe': return this.ok(intention.id, 'COMPLETED', 'Observing / resting in place.');
      case 'speak': return this.notImplemented(intention.id, 'speak');
      case 'hug':
      case 'touch':
      case 'kiss':
      case 'grab':
      case 'intimate': {
        const target = typeof intention.target === 'string' ? intention.target.trim() : '';
        if (!target) return this.fail(intention.id, 'FAILED', '[FAIL-CLOSED] Sensitive action requires an explicit target.');
        const externalDecision = (intention.parameters?.externalConsent as ExternalConsentDecision) || null;
        const validation = validateExternalConsent(externalDecision, {
          purpose: action === 'intimate' ? 'intimate' : action,
          actorId: this.residentId,
          targetId: target,
          actionId: action,
        });
        return this.fail(intention.id, 'FAILED', `[FAIL-CLOSED] ${validation.message} (status: ${validation.status})`);
      }
      case 'walk': case 'run': case 'hop': case 'jump': case 'skip':
      case 'eat': case 'drink': case 'useRestroom': case 'nap':
      case 'bathe': case 'brushTeeth': case 'combHair': case 'dress':
      case 'undress': case 'cook': case 'work':
        return this.notImplemented(intention.id, action);
      default: return this.fail(intention.id, 'FAILED', `Unknown action: ${String(action)}`);
    }
  }

  private ok(intentionId: string, lifecycle: ActionLifecycle, message: string): ActionResult {
    return { intentionId, lifecycle, success: true, partial: false, message };
  }
  private fail(intentionId: string, lifecycle: ActionLifecycle, message: string): ActionResult {
    return { intentionId, lifecycle, success: false, partial: false, message };
  }
  private notImplemented(intentionId: string, action: string): ActionResult {
    return { intentionId, lifecycle: 'NOT_IMPLEMENTED', success: false, partial: false, message: `NOT_IMPLEMENTED: ${action}. Zero state mutation.` };
  }
}
