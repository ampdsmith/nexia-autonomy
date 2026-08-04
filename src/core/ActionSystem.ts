import { ActionId, Intention, ActionResult, NeedType, BodyState } from './types';
import { validateExternalConsent, ExternalConsentDecision } from './ConsentBoundary';

/**
 * ActionSystem (hardened donor version)
 *
 * Executes intentions. Provides feedback.
 * All interpersonal and intimate actions are fail-closed.
 * This donor never authorizes touch or intimacy from internal need scores
 * or from a local capability boolean.
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
    const { action, target, parameters } = intention;

    // Basic safety: cannot act while falling unless recovering
    if (this.body.posture === 'falling' && action !== 'getUp') {
      return {
        intentionId: intention.id,
        success: false,
        partial: false,
        message: 'Cannot perform action while falling. Must recover first.',
      };
    }

    switch (action) {
      case 'walk':
      case 'run':
      case 'hop':
      case 'jump':
      case 'skip':
        return this.locomote(intention);

      case 'fall':
        this.body.posture = 'falling';
        return { intentionId: intention.id, success: true, partial: false, message: 'Fell.' };

      case 'getUp':
        if (this.body.posture === 'falling' || this.body.posture === 'lying') {
          this.body.posture = 'standing';
          return { intentionId: intention.id, success: true, partial: false, message: 'Got back up.' };
        }
        return { intentionId: intention.id, success: false, partial: false, message: 'Already upright.' };

      case 'eat':
        // STUB: no real inventory or food object check yet
        return this.applyNeedRelief(intention, { hunger: -35, energy: -5 }, 'STUB: eat succeeded without inventory or food validation');

      case 'drink':
        // STUB: no real water source check yet
        return this.applyNeedRelief(intention, { thirst: -40, bladder: +8 }, 'STUB: drink succeeded without source validation');

      case 'useRestroom':
        // STUB: no facility check yet
        return this.applyNeedRelief(intention, { bladder: -70 }, 'STUB: restroom use succeeded without facility validation');

      case 'nap':
        this.body.posture = 'lying';
        return this.applyNeedRelief(intention, { energy: -45, comfort: -10 }, 'STUB: nap succeeded without environment suitability check');

      case 'bathe':
        // STUB: no facility check yet
        return this.applyNeedRelief(intention, { hygiene: -50, comfort: -5 }, 'STUB: bathe succeeded without facility validation');

      case 'brushTeeth':
        return this.applyNeedRelief(intention, { hygiene: -15 }, 'STUB: brushTeeth');

      case 'combHair':
        return this.applyNeedRelief(intention, { hygiene: -8, comfort: -3 }, 'STUB: combHair');

      case 'dress':
      case 'undress':
        // STUB: clothing state not fully modeled
        return {
          intentionId: intention.id,
          success: true,
          partial: true,
          message: `STUB: ${action} reported success but clothing inventory is not yet fully implemented.`,
        };

      case 'cook':
        // STUB: no ingredients or kitchen validation
        return {
          intentionId: intention.id,
          success: true,
          partial: true,
          message: 'STUB: cook reported success without ingredients or facility validation.',
          newStateHints: { purpose: -5, hunger: -5 },
        };

      case 'work':
        return this.applyNeedRelief(intention, { purpose: -25, energy: +8, curiosity: -5 }, 'STUB: work');

      // Interpersonal and intimate actions — fail-closed donor boundary
      case 'hug':
      case 'touch':
      case 'kiss':
      case 'grab':
      case 'intimate': {
        const externalDecision = (parameters?.externalConsent as ExternalConsentDecision) || null;
        const purpose = action === 'intimate' ? 'intimate' : action;
        const validation = validateExternalConsent(externalDecision, purpose);

        return {
          intentionId: intention.id,
          success: false,
          partial: false,
          message: `[FAIL-CLOSED] ${validation.message} (status: ${validation.status})`,
        };
      }

      case 'idle':
      case 'observe':
        return { intentionId: intention.id, success: true, partial: false, message: 'Observing / resting in place.' };

      case 'speak':
        return { intentionId: intention.id, success: true, partial: false, message: `Spoke: ${parameters?.text ?? '...'}` };

      default:
        return { intentionId: intention.id, success: false, partial: false, message: `Unknown action: ${action}` };
    }
  }

  private locomote(intention: Intention): ActionResult {
    // STUB: location is a string rewrite only. No physics, collision, or pathfinding.
    const dest = (intention.parameters?.destination as string) || intention.target || 'nearby';
    this.body.location = dest;
    this.body.posture = 'standing';
    const cost = intention.action === 'run' ? 8 : intention.action === 'jump' ? 6 : 3;
    return {
      intentionId: intention.id,
      success: true,
      partial: true,
      message: `STUB: ${intention.action} to ${dest} (string location only, no physics)`,
      newStateHints: { energy: cost, curiosity: -2 },
    };
  }

  private applyNeedRelief(
    intention: Intention,
    deltas: Partial<Record<NeedType, number>>,
    note: string
  ): ActionResult {
    return {
      intentionId: intention.id,
      success: true,
      partial: true,
      message: note,
      newStateHints: deltas,
    };
  }
}
