/**
 * Influence Channels (hardened)
 * Voice, Mouse, Touch → InfluenceEvent only.
 * Never direct control of movement or decisions.
 * Keyboard locomotion remains intentionally absent.
 * Events carry expiration and start unconsumed.
 */

import { InfluenceEvent } from '../core/types';
import { v4 as uuid } from 'uuid';

const DEFAULT_TTL_MS = 30_000;

export function createVoiceInfluence(
  transcript: string,
  strength = 0.6,
  ttlMs = DEFAULT_TTL_MS,
  speakerId?: string
): InfluenceEvent {
  const now = Date.now();
  return {
    id: uuid(),
    channel: 'voice',
    content: transcript,
    timestamp: now,
    strength: Math.max(0, Math.min(1, strength)),
    expiresAt: now + ttlMs,
    consumed: false,
    speakerId,
  };
}

export function createMouseInfluence(payload: {
  x: number;
  y: number;
  targetObject?: string;
  button?: number;
}, ttlMs = DEFAULT_TTL_MS): InfluenceEvent {
  const now = Date.now();
  return {
    id: uuid(),
    channel: 'mouse',
    content: payload,
    timestamp: now,
    strength: 0.5,
    expiresAt: now + ttlMs,
    consumed: false,
  };
}

export function createTouchInfluence(payload: {
  touches: Array<{ id: number; x: number; y: number }>;
  gesture?: string;
  targetObject?: string;
}, ttlMs = DEFAULT_TTL_MS): InfluenceEvent {
  const now = Date.now();
  return {
    id: uuid(),
    channel: 'touch',
    content: payload,
    timestamp: now,
    strength: 0.55,
    expiresAt: now + ttlMs,
    consumed: false,
  };
}
