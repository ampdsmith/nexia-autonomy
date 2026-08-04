import { Intention, ActionResult, BodyState, ActionLifecycle } from './types';
import { validateExternalConsent, ExternalConsentDecision } from './ConsentBoundary';

/**
 * ActionSystem (correction cycle)
 *
 * Unimplemented actions return lifecycle NOT_IMPLEMENTED,
 * success=false, partial=false, and perform zero body or need mutation.
 * Implementation maturity is never encoded as Resident success.
 */
export class ActionSystem {
  private body: BodyState;

  constructor(initialBody: BodyState) {
    this.body = { ...initialBody };
  }

  getBody(): BodyState {
    return { ...this.body };
  }

  async execute(intention: Intention): Promise<ActionResult> {
    const { action } = intention;

    if (this.body.posture === 'falling' && action !== 'getUp') {
      return this.fail(intention.id, 'FAILED', 'Cannot perform action while falling.');
    }

    switch (action) {
      // Fully local safety actions that can run without external world
      case 'fall':
        this.body.posture = 'falling';
        return this.ok(intention.id, 'COMPLETED', 'Fell.');

      case 'getUp':
        if (this.body.posture === 'falling' || this.body.posture === 'lying') {
          this.body.posture = 'standing';
          return this.ok(intention.id, 'COMPLETED', 'Got back up.');
        }
        return this.fail(intention.id, 'FAILED', 'Already upright.');

      case 'idle':
      case 'observe':
        return this.ok(intention.id, 'COMPLETED', 'Observing / resting in place.');

      case 'speak':
        return this.ok(intention.id, 'COMPLETED', `Spoke: ${(intention.parameters?.text as string) ?? '...'}`);

      // Interpersonal — always fail-closed until canonical consent exists
      case 'hug':
      case 'touch':
      case 'kiss':
      case 'grab':
      case 'intimate': {
        const externalDecision = (intention.parameters?.externalConsent as ExternalConsentDecision) || null;
        const purpose = action === 'intimate' ? 'intimate' : action;
        const validation = validateExternalConsent(externalDecision, purpose);
        return {
          intentionId: intention.id,
          lifecycle: 'FAILED',
          success: false,
          partial: false,
          message: `[FAIL-CLOSED] ${validation.message} (status: ${validation.status})`,
        };
      }

      // Everything else is still NOT_IMPLEMENTED in this donor.
      // No body mutation. No need mutation.
      case 'walk':
      case 'run':
      case 'hop':
      case 'jump':
      case 'skip':
      case 'eat':
      case 'drink':
      case 'useRestroom':
      case 'nap':
      case 'bathe':
      case 'brushTeeth':
      case 'combHair':
      case 'dress':
      case 'undress':
      case 'cook':
      case 'work':
        return this.notImplemented(intention.id, action);

      default:
        return this.fail(intention.id, 'FAILED', `Unknown action: ${action}`);
    }
  }

  private ok(intentionId: string, lifecycle: ActionLifecycle, message: string): ActionResult {
    return {
      intentionId,
      lifecycle,
      success: true,
      partial: false,
      message,
    };
  }

  private fail(intentionId: string, lifecycle: ActionLifecycle, message: string): ActionResult {
    return {
      intentionId,
      lifecycle,
      success: false,
      partial: false,
      message,
    };
  }

  private notImplemented(intentionId: string, action: string): ActionResult {
    return {
      intentionId,
      lifecycle: 'NOT_IMPLEMENTED',
      success: false,
      partial: false,
      message: `NOT_IMPLEMENTED: ${action} has no real embodiment, facility, inventory, or physics in this donor. Zero state mutation.`,
    };
  }
}
