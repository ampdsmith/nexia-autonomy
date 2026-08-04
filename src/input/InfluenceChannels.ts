/**
 * Influence Channels (correction cycle)
 * Bounded TTL. Fail-closed on invalid values.
 * Keyboard locomotion remains absent.
 */

import { InfluenceEvent, INFLUENCE_TTL_MIN_MS, INFLUENCE_TTL_MAX_MS, INFLUENCE_TTL_DEFAULT_MS } from '../core/types';
import { v4 as uuid } from 'uuid';

function sanitizeTtl(ttlMs: number | undefined): number {
  if (ttlMs === undefined || ttlMs === null) return INFLUENCE_TTL_DEFAULT_MS;
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return INFLUENCE_TTL_DEFAULT_MS;
  if (ttlMs < INFLUENCE_TTL_MIN_MS) return INFLUENCE_TTL_MIN_MS;
  if (ttlMs > INFLUENCE_TTL_MAX_MS) return INFLUENCE_TTL_MAX_MS;
  return Math.floor(ttlMs);
}

export function createVoiceInfluence(
  transcript: string,
  strength = 0.6,
  ttlMs?: number,
  opts?: { speakerId?: string; targetResidentId?: string; provenance?: string; confidence?: number }
): InfluenceEvent {
  const now = Date.now();
  const ttl = sanitizeTtl(ttlMs);
  return {
    id: uuid(),
    channel: 'voice',
    content: transcript,
    timestamp: now,
    strength: Math.max(0, Math.min(1, strength)),
    expiresAt: now + ttl,
    consumed: false,
    speakerId: opts?.speakerId,
    targetResidentId: opts?.targetResidentId,
    provenance: opts?.provenance,
    confidence: opts?.confidence !== undefined ? Math.max(0, Math.min(1, opts.confidence)) : undefined,
  };
}

export function createMouseInfluence(
  payload: { x: number; y: number; targetObject?: string; button?: number },
  ttlMs?: number,
  opts?: { targetResidentId?: string; provenance?: string; confidence?: number }
): InfluenceEvent {
  const now = Date.now();
  const ttl = sanitizeTtl(ttlMs);
  return {
    id: uuid(),
    channel: 'mouse',
    content: payload,
    timestamp: now,
    strength: 0.5,
    expiresAt: now + ttl,
    consumed: false,
    targetResidentId: opts?.targetResidentId,
    provenance: opts?.provenance,
    confidence: opts?.confidence,
  };
}

export function createTouchInfluence(
  payload: { touches: Array<{ id: number; x: number; y: number }>; gesture?: string; targetObject?: string },
  ttlMs?: number,
  opts?: { targetResidentId?: string; provenance?: string; confidence?: number }
): InfluenceEvent {
  const now = Date.now();
  const ttl = sanitizeTtl(ttlMs);
  return {
    id: uuid(),
    channel: 'touch',
    content: payload,
    timestamp: now,
    strength: 0.55,
    expiresAt: now + ttl,
    consumed: false,
    targetResidentId: opts?.targetResidentId,
    provenance: opts?.provenance,
    confidence: opts?.confidence,
  };
}
