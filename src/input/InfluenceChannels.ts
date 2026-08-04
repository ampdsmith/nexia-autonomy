/**
 * Influence Channels
 * Voice, Mouse, Touch → InfluenceEvent only.
 * Never direct control of movement or decisions.
 * Keyboard locomotion is intentionally absent from this module.
 */

import { InfluenceEvent } from '../core/types';
import { v4 as uuid } from 'uuid';

export function createVoiceInfluence(transcript: string, strength = 0.6): InfluenceEvent {
  return {
    id: uuid(),
    channel: 'voice',
    content: transcript,
    timestamp: Date.now(),
    strength: Math.max(0, Math.min(1, strength)),
  };
}

export function createMouseInfluence(payload: {
  x: number;
  y: number;
  targetObject?: string;
  button?: number;
}): InfluenceEvent {
  return {
    id: uuid(),
    channel: 'mouse',
    content: payload,
    timestamp: Date.now(),
    strength: 0.5,
  };
}

export function createTouchInfluence(payload: {
  touches: Array<{ id: number; x: number; y: number }>;
  gesture?: string;
  targetObject?: string;
}): InfluenceEvent {
  return {
    id: uuid(),
    channel: 'touch',
    content: payload,
    timestamp: Date.now(),
    strength: 0.55,
  };
}

/**
 * Browser integration helpers (to be wired in frontend):
 * - Web Speech API → createVoiceInfluence
 * - pointerdown / pointermove → createMouseInfluence
 * - touchstart / touchmove → createTouchInfluence
 *
 * The resulting InfluenceEvent is pushed to resident.influence(...).
 * The CognitionLoop / Mind decides whether and how to respond.
 */
