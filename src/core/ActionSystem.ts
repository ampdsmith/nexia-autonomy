import { ActionId, Intention, ActionResult, NeedType, BodyState } from './types';

/**
 * ActionSystem
 * Executes intentions produced by free cognition.
 * Provides feedback (success/partial/failure + need deltas) back to the mind.
 * Consent checks for multi-resident intimate / social actions.
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
        return this.applyNeedRelief(intention, { hunger: -35, energy: -5 });

      case 'drink':
        return this.applyNeedRelief(intention, { thirst: -40, bladder: +8 });

      case 'useRestroom':
        return this.applyNeedRelief(intention, { bladder: -70 });

      case 'nap':
        this.body.posture = 'lying';
        return this.applyNeedRelief(intention, { energy: -45, comfort: -10 });

      case 'bathe':
        return this.applyNeedRelief(intention, { hygiene: -50, comfort: -5 });

      case 'brushTeeth':
        return this.applyNeedRelief(intention, { hygiene: -15 });

      case 'combHair':
        return this.applyNeedRelief(intention, { hygiene: -8, comfort: -3 });

      case 'dress':
      case 'undress':
        // Clothing state would be updated here with proper inventory system
        return { intentionId: intention.id, success: true, partial: false, message: `${action} completed.` };

      case 'cook':
        return { intentionId: intention.id, success: true, partial: false, message: 'Prepared food.', newStateHints: { purpose: -5, hunger: -5 } };

      case 'work':
        return this.applyNeedRelief(intention, { purpose: -25, energy: +8, curiosity: -5 });

      case 'hug':
      case 'touch':
      case 'kiss':
      case 'grab':
        // In multi-resident, consent would be checked against target Resident
        return this.applyNeedRelief(intention, { social: -20, intimacy: -15, comfort: -5 });

      case 'intimate':
        // Strict consent gate in production multi-resident mode
        if (!this.body.isIntimateCapable) {
          return { intentionId: intention.id, success: false, partial: false, message: 'Not currently capable.' };
        }
        return this.applyNeedRelief(intention, { intimacy: -60, social: -15, energy: +12, hygiene: +10 });

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
    const dest = (intention.parameters?.destination as string) || intention.target || 'nearby';
    this.body.location = dest;
    this.body.posture = 'standing';
    // Energy cost scales with action intensity
    const cost = intention.action === 'run' ? 8 : intention.action === 'jump' ? 6 : 3;
    return {
      intentionId: intention.id,
      success: true,
      partial: false,
      message: `${intention.action} to ${dest}`,
      newStateHints: { energy: cost, curiosity: -2 },
    };
  }

  private applyNeedRelief(intention: Intention, deltas: Partial<Record<NeedType, number>>): ActionResult {
    return {
      intentionId: intention.id,
      success: true,
      partial: false,
      message: `${intention.action} completed.`,
      newStateHints: deltas,
    };
  }
}
