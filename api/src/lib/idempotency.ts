// Idempotency-Key support for unsafe requests.
//
// A client that retries a POST after a network blip should not create a second
// payment. Sending an Idempotency-Key header makes the first response the
// canonical one: an identical retry replays it, and a different body under the
// same key is rejected with 409.

import { Env } from '../types';
import { errorResponse, jsonResponse, getCurrentTimestamp } from '../utils';

const KEY_TTL_HOURS = 24;
const MAX_KEY_LENGTH = 255;

async function fingerprint(endpoint: string, body: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${endpoint}\n${body}`)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface IdempotencyCheck {
  /** Present when the caller should return this response immediately. */
  shortCircuit?: Response;
  /** Present when the handler should run and later persist its result. */
  key?: string;
  fingerprint?: string;
}

/**
 * Inspect the Idempotency-Key header before running a handler.
 *
 * Returns `{}` when there is no key (nothing to do), `{ shortCircuit }` when a
 * stored response should be replayed or the key was reused with a different
 * body, or `{ key, fingerprint }` when the handler should proceed.
 */
export async function checkIdempotency(
  env: Env,
  request: Request,
  endpoint: string,
  bodyText: string,
  requestId: string
): Promise<IdempotencyCheck> {
  const key = request.headers.get('Idempotency-Key');
  if (!key) return {};

  if (key.length > MAX_KEY_LENGTH) {
    return {
      shortCircuit: jsonResponse(
        errorResponse(
          'INVALID_REQUEST',
          `Idempotency-Key must be at most ${MAX_KEY_LENGTH} characters`,
          requestId
        ),
        400,
        { 'X-Request-Id': requestId }
      ),
    };
  }

  const print = await fingerprint(endpoint, bodyText);

  try {
    const existing = await env.DB.prepare('SELECT * FROM idempotency_keys WHERE key = ?')
      .bind(key)
      .first<any>();

    if (!existing) return { key, fingerprint: print };

    // Expired keys are recycled.
    if (Date.parse(existing.expires_at) < Date.now()) {
      await env.DB.prepare('DELETE FROM idempotency_keys WHERE key = ?').bind(key).run();
      return { key, fingerprint: print };
    }

    if (existing.request_fingerprint !== print) {
      return {
        shortCircuit: jsonResponse(
          errorResponse(
            'IDEMPOTENCY_KEY_REUSE',
            'This Idempotency-Key has already been used with a different request body. Use a new key for a new request.',
            requestId
          ),
          409,
          {
            'X-Request-Id': requestId,
            'Idempotency-Key': key,
            'Idempotency-Replayed': 'false',
          }
        ),
      };
    }

    // Same key, same body - replay the original response verbatim.
    return {
      shortCircuit: new Response(existing.response_body, {
        status: existing.response_status,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
          'Idempotency-Key': key,
          'Idempotency-Replayed': 'true',
          'X-Original-Request-Time': existing.created_at,
        },
      }),
    };
  } catch (error) {
    // Idempotency must never take the endpoint down; fall through to normal handling.
    console.error('Idempotency lookup failed:', error);
    return { key, fingerprint: print };
  }
}

/** Persist a handler's response so a later retry with the same key replays it. */
export async function storeIdempotentResponse(
  env: Env,
  key: string,
  fingerprintValue: string,
  endpoint: string,
  status: number,
  body: string,
  resourceId?: string
): Promise<void> {
  // Only successful creations are worth replaying; errors should be retryable.
  if (status < 200 || status >= 300) return;

  const now = getCurrentTimestamp();
  const expiresAt = new Date(Date.now() + KEY_TTL_HOURS * 3600 * 1000).toISOString();

  try {
    await env.DB.prepare(
      `INSERT OR REPLACE INTO idempotency_keys
         (key, endpoint, request_fingerprint, response_status, response_body, resource_id, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(key, endpoint, fingerprintValue, status, body, resourceId ?? null, now, expiresAt)
      .run();
  } catch (error) {
    console.error('Failed to store idempotency record:', error);
  }
}
