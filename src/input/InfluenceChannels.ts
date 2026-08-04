import { randomUUID } from 'node:crypto';
import {
  InfluenceEvent, INFLUENCE_TTL_MIN_MS, INFLUENCE_TTL_MAX_MS, INFLUENCE_TTL_DEFAULT_MS,
} from '../core/types';

export interface InfluenceIdentity {
  targetResidentId: string;
  provenance: string;
  speakerId?: string;
  confidence?: number;
}

function boundedString(value: unknown, field: string, max = 200): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new TypeError(`${field} must be a non-empty bounded string.`);
  return value.trim();
}
function sanitizeTtl(ttlMs: number | undefined): number {
  if (ttlMs === undefined) return INFLUENCE_TTL_DEFAULT_MS;
  if (!Number.isFinite(ttlMs) || ttlMs < INFLUENCE_TTL_MIN_MS || ttlMs > INFLUENCE_TTL_MAX_MS) {
    throw new RangeError(`ttlMs must be ${INFLUENCE_TTL_MIN_MS}-${INFLUENCE_TTL_MAX_MS}.`);
  }
  return Math.floor(ttlMs);
}
function boundedUnit(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${field} must be between 0 and 1.`);
  return value;
}
function identity(opts: InfluenceIdentity) {
  return {
    targetResidentId: boundedString(opts?.targetResidentId, 'targetResidentId'),
    provenance: boundedString(opts?.provenance, 'provenance'),
    speakerId: opts?.speakerId === undefined ? undefined : boundedString(opts.speakerId, 'speakerId'),
    confidence: opts?.confidence === undefined ? undefined : boundedUnit(opts.confidence, 'confidence'),
  };
}

export function createVoiceInfluence(transcript: string, opts: InfluenceIdentity, strength = 0.6, ttlMs?: number): InfluenceEvent {
  const now = Date.now();
  const clean = boundedString(transcript, 'transcript', 2048);
  return {
    id: randomUUID(), channel: 'voice', content: clean, timestamp: now,
    strength: boundedUnit(strength, 'strength'), expiresAt: now + sanitizeTtl(ttlMs), consumed: false,
    ...identity(opts),
  };
}

export function createMouseInfluence(
  payload: { x: number; y: number; targetObject?: string; button?: number }, opts: InfluenceIdentity, ttlMs?: number,
): InfluenceEvent {
  if (!Number.isFinite(payload?.x) || !Number.isFinite(payload?.y)) throw new TypeError('Mouse coordinates must be finite.');
  const now = Date.now();
  return { id: randomUUID(), channel: 'mouse', content: { ...payload }, timestamp: now, strength: 0.5,
    expiresAt: now + sanitizeTtl(ttlMs), consumed: false, ...identity(opts) };
}

export function createTouchInfluence(
  payload: { touches: Array<{ id: number; x: number; y: number }>; gesture?: string; targetObject?: string },
  opts: InfluenceIdentity, ttlMs?: number,
): InfluenceEvent {
  if (!Array.isArray(payload?.touches) || payload.touches.length === 0 || payload.touches.length > 10
      || payload.touches.some((t) => !Number.isFinite(t.id) || !Number.isFinite(t.x) || !Number.isFinite(t.y))) {
    throw new TypeError('Touch payload must contain 1-10 finite touch points.');
  }
  const now = Date.now();
  return { id: randomUUID(), channel: 'touch', content: { ...payload, touches: payload.touches.map((t) => ({ ...t })) },
    timestamp: now, strength: 0.55, expiresAt: now + sanitizeTtl(ttlMs), consumed: false, ...identity(opts) };
}
