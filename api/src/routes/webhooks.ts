// Webhooks - outbound event delivery with a signed payload and an attempt log.
//
// Register a subscription with a callback URL, then trigger events (either by
// performing a real action such as creating a payment, or by calling the test
// endpoint). Every attempt is recorded so a test can assert on delivery status,
// response code and the signature that was sent.

import { Router, IRequest } from 'itty-router';
import { Env, RequestContext } from '../types';
import {
  jsonResponse,
  errorResponse,
  successResponse,
  paginatedResponse,
  calculatePagination,
  parsePaginationParams,
  generateId,
  getCurrentTimestamp,
} from '../utils';

export const webhooksRouter = Router({ base: '/v1/webhooks' });

export const WEBHOOK_EVENTS = [
  'payment.created',
  'payment.completed',
  'payment.failed',
  'payment.refunded',
  'bill.created',
  'bill.paid',
  'bill.overdue',
  'user.created',
  'test.ping',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

const DELIVERY_TIMEOUT_MS = 5000;

// ============================================
// Signing
// ============================================

/**
 * Stripe-style signature header: `t=<unix>,v1=<hex>` where the signed payload
 * is `<unix>.<body>`. Receivers recompute the HMAC to verify authenticity.
 */
export async function signPayload(secret: string, body: string, timestamp: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${body}`)
  );
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `t=${timestamp},v1=${hex}`;
}

// ============================================
// Dispatch
// ============================================

interface DeliveryOutcome {
  id: string;
  subscriptionId: string;
  event: string;
  status: 'delivered' | 'failed';
  statusCode: number | null;
  error: string | null;
  durationMs: number;
  signature: string;
}

/**
 * Deliver one event to one subscription and record the attempt.
 * Never throws - a failed delivery is recorded, not propagated.
 */
async function deliver(
  env: Env,
  subscription: any,
  event: string,
  data: unknown,
  attempt = 1
): Promise<DeliveryOutcome> {
  const deliveryId = `whd-${generateId().slice(0, 12)}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const envelope = {
    id: `evt-${generateId().slice(0, 12)}`,
    type: event,
    createdAt: getCurrentTimestamp(),
    data,
  };
  const body = JSON.stringify(envelope);
  const signature = await signPayload(subscription.secret, body, timestamp);
  const startedAt = Date.now();

  let status: 'delivered' | 'failed' = 'failed';
  let statusCode: number | null = null;
  let error: string | null = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    const response = await fetch(subscription.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'billpay-api-webhooks/1.0',
        'X-Webhook-Event': event,
        'X-Webhook-Delivery': deliveryId,
        'X-Webhook-Signature': signature,
        'X-Webhook-Attempt': String(attempt),
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timer);
    statusCode = response.status;
    status = response.ok ? 'delivered' : 'failed';
    if (!response.ok) error = `Endpoint responded with ${response.status}`;
  } catch (e: any) {
    error = e?.name === 'AbortError' ? `Timed out after ${DELIVERY_TIMEOUT_MS}ms` : String(e?.message || e);
  }

  const durationMs = Date.now() - startedAt;
  const now = getCurrentTimestamp();

  try {
    await env.DB.prepare(
      `INSERT INTO webhook_deliveries
         (id, subscription_id, event, payload, signature, status, status_code, attempt, error, duration_ms, created_at, delivered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        deliveryId,
        subscription.id,
        event,
        body,
        signature,
        status,
        statusCode,
        attempt,
        error,
        durationMs,
        now,
        status === 'delivered' ? now : null
      )
      .run();
  } catch (e) {
    console.error('Failed to record webhook delivery:', e);
  }

  return {
    id: deliveryId,
    subscriptionId: subscription.id,
    event,
    status,
    statusCode,
    error,
    durationMs,
    signature,
  };
}

/**
 * Fan an event out to every active subscription listening for it.
 * Safe to call from business endpoints - it swallows all errors.
 */
export async function dispatchWebhookEvent(
  env: Env,
  event: WebhookEvent | string,
  data: unknown
): Promise<DeliveryOutcome[]> {
  try {
    const subs = await env.DB.prepare(
      `SELECT * FROM webhook_subscriptions WHERE is_active = 1`
    ).all();

    const matching = (subs.results || []).filter((sub: any) => {
      try {
        const events: string[] = JSON.parse(sub.events);
        return events.includes(event) || events.includes('*');
      } catch {
        return false;
      }
    });

    if (matching.length === 0) return [];

    return await Promise.all(matching.map((sub) => deliver(env, sub, event, data)));
  } catch (e) {
    console.error('Webhook dispatch failed:', e);
    return [];
  }
}

// ============================================
// GET /v1/webhooks/events - Supported event types
// ============================================
webhooksRouter.get('/events', (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();

  return jsonResponse(
    successResponse(
      {
        events: WEBHOOK_EVENTS,
        wildcard: '*',
        signatureHeader: 'X-Webhook-Signature',
        signatureFormat: 't=<unix-seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">',
        deliveryTimeoutMs: DELIVERY_TIMEOUT_MS,
      },
      { requestId, version: env.API_VERSION }
    ),
    200,
    { 'X-Request-Id': requestId }
  );
});

// ============================================
// POST /v1/webhooks - Register a subscription
// ============================================
webhooksRouter.post('/', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();

  let body: any;
  try {
    body = await request.json() as any;
  } catch {
    return jsonResponse(
      errorResponse('MALFORMED_JSON', 'The request body is not valid JSON', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  const errors: { field: string; code: string; message: string }[] = [];

  if (!body?.url) {
    errors.push({ field: 'url', code: 'REQUIRED', message: 'url is required' });
  } else {
    try {
      const parsed = new URL(body.url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        errors.push({ field: 'url', code: 'INVALID_VALUE', message: 'url must use http or https' });
      }
    } catch {
      errors.push({ field: 'url', code: 'INVALID_VALUE', message: 'url must be a valid absolute URL' });
    }
  }

  const events: string[] = Array.isArray(body?.events) ? body.events : ['*'];
  const invalid = events.filter(
    (e) => e !== '*' && !(WEBHOOK_EVENTS as readonly string[]).includes(e)
  );
  if (invalid.length > 0) {
    errors.push({
      field: 'events',
      code: 'INVALID_VALUE',
      message: `Unknown event(s): ${invalid.join(', ')}. Supported: ${WEBHOOK_EVENTS.join(', ')}, *`,
    });
  }

  if (errors.length > 0) {
    return jsonResponse(
      errorResponse('VALIDATION_ERROR', 'Invalid webhook subscription', requestId, errors),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  const id = `whs-${generateId().slice(0, 12)}`;
  const secret = `whsec-${generateId()}`;
  const now = getCurrentTimestamp();

  try {
    await env.DB.prepare(
      `INSERT INTO webhook_subscriptions (id, url, events, secret, description, is_active, created_at, updated_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        body.url,
        JSON.stringify(events),
        secret,
        body.description || null,
        body.isActive === false ? 0 : 1,
        now,
        now,
        ctx?.auth?.identifier || 'user'
      )
      .run();

    return jsonResponse(
      successResponse(
        {
          id,
          url: body.url,
          events,
          // The secret is returned in full only on creation.
          secret,
          description: body.description || null,
          isActive: body.isActive !== false,
          createdAt: now,
          updatedAt: now,
        },
        { requestId, version: env.API_VERSION }
      ),
      201,
      { 'X-Request-Id': requestId, Location: `/v1/webhooks/${id}` }
    );
  } catch (error) {
    console.error('Error creating webhook subscription:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to create webhook subscription', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/webhooks - List subscriptions
// ============================================
webhooksRouter.get('/', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);
  const { page, limit, offset, mode } = parsePaginationParams(url);

  try {
    const countRow = await env.DB.prepare('SELECT COUNT(*) as count FROM webhook_subscriptions')
      .first<{ count: number }>();
    const total = countRow?.count || 0;

    const rows = await env.DB.prepare(
      'SELECT * FROM webhook_subscriptions ORDER BY created_at DESC LIMIT ? OFFSET ?'
    )
      .bind(limit, offset)
      .all();

    const data = (rows.results || []).map((row) => formatSubscription(row));
    const pagination = calculatePagination(page, limit, total, {
      includeCursors: mode === 'cursor',
      lastItemId: data[data.length - 1]?.id,
    });

    return jsonResponse(
      paginatedResponse(data, pagination, { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error listing webhook subscriptions:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to list webhook subscriptions', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/webhooks/:id/deliveries - Delivery attempt log
// ============================================
webhooksRouter.get('/:id/deliveries', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};
  const url = new URL(request.url);
  const { page, limit, offset, mode } = parsePaginationParams(url);
  const status = url.searchParams.get('status');
  const event = url.searchParams.get('event');

  try {
    const sub = await env.DB.prepare('SELECT id FROM webhook_subscriptions WHERE id = ?')
      .bind(id)
      .first();

    if (!sub) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Webhook subscription '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    let whereClause = 'WHERE subscription_id = ?';
    const params: unknown[] = [id];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    if (event) {
      whereClause += ' AND event = ?';
      params.push(event);
    }

    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM webhook_deliveries ${whereClause}`
    )
      .bind(...params)
      .first<{ count: number }>();
    const total = countRow?.count || 0;

    const rows = await env.DB.prepare(
      `SELECT * FROM webhook_deliveries ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
      .bind(...params, limit, offset)
      .all();

    const data = (rows.results || []).map((row: any) => ({
      id: row.id,
      subscriptionId: row.subscription_id,
      event: row.event,
      status: row.status,
      statusCode: row.status_code,
      attempt: row.attempt,
      error: row.error,
      durationMs: row.duration_ms,
      signature: row.signature,
      payload: safeParse(row.payload),
      createdAt: row.created_at,
      deliveredAt: row.delivered_at,
    }));

    const pagination = calculatePagination(page, limit, total, {
      includeCursors: mode === 'cursor',
      lastItemId: data[data.length - 1]?.id,
    });

    return jsonResponse(
      paginatedResponse(data, pagination, { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error listing webhook deliveries:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to list webhook deliveries', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// POST /v1/webhooks/:id/test - Fire a test delivery
// ============================================
webhooksRouter.post('/:id/test', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  let body: any = {};
  try {
    const raw = await request.text();
    if (raw.trim()) body = JSON.parse(raw);
  } catch {
    body = {};
  }

  try {
    const sub = await env.DB.prepare('SELECT * FROM webhook_subscriptions WHERE id = ?')
      .bind(id)
      .first();

    if (!sub) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Webhook subscription '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const event = body.event || 'test.ping';
    const outcome = await deliver(env, sub, event, body.data ?? { message: 'This is a test event.' });

    return jsonResponse(
      successResponse(outcome, { requestId, version: env.API_VERSION }),
      outcome.status === 'delivered' ? 200 : 502,
      { 'X-Request-Id': requestId, 'X-Delivery-Id': outcome.id }
    );
  } catch (error) {
    console.error('Error firing test webhook:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fire test webhook', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/webhooks/:id - Get a subscription
// ============================================
webhooksRouter.get('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  try {
    const row = await env.DB.prepare('SELECT * FROM webhook_subscriptions WHERE id = ?')
      .bind(id)
      .first();

    if (!row) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Webhook subscription '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    return jsonResponse(
      successResponse(formatSubscription(row), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error fetching webhook subscription:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch webhook subscription', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// PATCH /v1/webhooks/:id - Update a subscription
// ============================================
webhooksRouter.patch('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  let body: any;
  try {
    body = await request.json() as any;
  } catch {
    return jsonResponse(
      errorResponse('MALFORMED_JSON', 'The request body is not valid JSON', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const existing = await env.DB.prepare('SELECT * FROM webhook_subscriptions WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Webhook subscription '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.url !== undefined) {
      updates.push('url = ?');
      values.push(body.url);
    }
    if (body.events !== undefined) {
      updates.push('events = ?');
      values.push(JSON.stringify(body.events));
    }
    if (body.description !== undefined) {
      updates.push('description = ?');
      values.push(body.description);
    }
    if (body.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(body.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return jsonResponse(
        errorResponse('INVALID_REQUEST', 'No valid fields to update', requestId),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    updates.push('updated_at = ?');
    values.push(getCurrentTimestamp(), id);

    await env.DB.prepare(`UPDATE webhook_subscriptions SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const updated = await env.DB.prepare('SELECT * FROM webhook_subscriptions WHERE id = ?')
      .bind(id)
      .first();

    return jsonResponse(
      successResponse(formatSubscription(updated), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error updating webhook subscription:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to update webhook subscription', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// DELETE /v1/webhooks/:id - Remove a subscription
// ============================================
webhooksRouter.delete('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  try {
    const existing = await env.DB.prepare('SELECT id FROM webhook_subscriptions WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Webhook subscription '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    await env.DB.prepare('DELETE FROM webhook_deliveries WHERE subscription_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM webhook_subscriptions WHERE id = ?').bind(id).run();

    return new Response(null, { status: 204, headers: { 'X-Request-Id': requestId } });
  } catch (error) {
    console.error('Error deleting webhook subscription:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to delete webhook subscription', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// Helpers
// ============================================

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function formatSubscription(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    url: row.url,
    events: safeParse(row.events),
    // Only a hint of the secret is exposed after creation.
    secretHint: typeof row.secret === 'string' ? `${row.secret.slice(0, 12)}...` : null,
    description: row.description,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
