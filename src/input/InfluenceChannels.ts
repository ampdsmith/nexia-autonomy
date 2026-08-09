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
function optionalBoundedString(value: unknown, field: string, max = 200): string | undefined {
  if (value === undefined) return undefined;
  return boundedString(value, field, max);
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
function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
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
  if (!payload || typeof payload !== 'object' || !hasOnlyKeys(payload as unknown as Record<string, unknown>, ['x', 'y', 'targetObject', 'button'])) {
    throw new TypeError('Mouse payload contains unsupported fields.');
  }
  if (!Number.isFinite(payload.x) || !Number.isFinite(payload.y)) throw new TypeError('Mouse coordinates must be finite.');
  if (payload.button !== undefined && (!Number.isInteger(payload.button) || payload.button < 0 || payload.button > 5)) {
    throw new RangeError('Mouse button must be an integer from 0 through 5.');
  }
  const targetObject = optionalBoundedString(payload.targetObject, 'targetObject');
  const now = Date.now();
  return {
    id: randomUUID(), channel: 'mouse',
    content: { x: payload.x, y: payload.y, ...(targetObject === undefined ? {} : { targetObject }), ...(payload.button === undefined ? {} : { button: payload.button }) },
    timestamp: now, strength: 0.5, expiresAt: now + sanitizeTtl(ttlMs), consumed: false, ...identity(opts),
  };
}

export function createTouchInfluence(
  payload: { touches: Array<{ id: number; x: number; y: number }>; gesture?: string; targetObject?: string },
  opts: InfluenceIdentity, ttlMs?: number,
): InfluenceEvent {
  if (!payload || typeof payload !== 'object' || !hasOnlyKeys(payload as unknown as Record<string, unknown>, ['touches', 'gesture', 'targetObject'])) {
    throw new TypeError('Touch payload contains unsupported fields.');
  }
  if (!Array.isArray(payload.touches) || payload.touches.length === 0 || payload.touches.length > 10) {
    throw new TypeError('Touch payload must contain 1-10 touch points.');
  }
  const ids = new Set<number>();
  const touches = payload.touches.map((point) => {
    if (!point || typeof point !== 'object' || !hasOnlyKeys(point as unknown as Record<string, unknown>, ['id', 'x', 'y'])
        || !Number.isInteger(point.id) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new TypeError('Each touch point requires an integer id and finite x/y coordinates.');
    }
    if (ids.has(point.id)) throw new TypeError('Touch point ids must be unique.');
    ids.add(point.id);
    return { id: point.id, x: point.x, y: point.y };
  });
  const gesture = optionalBoundedString(payload.gesture, 'gesture');
  const targetObject = optionalBoundedString(payload.targetObject, 'targetObject');
  const now = Date.now();
  return {
    id: randomUUID(), channel: 'touch',
    content: { touches, ...(gesture === undefined ? {} : { gesture }), ...(targetObject === undefined ? {} : { targetObject }) },
    timestamp: now, strength: 0.55, expiresAt: now + sanitizeTtl(ttlMs), consumed: false, ...identity(opts),
  };
}
