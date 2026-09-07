// Bulk create - POST /v1/{resource}/bulk
//
// Accepts an array of items and returns 207 Multi-Status with one result per
// item, so a partial failure is visible per row rather than failing the whole
// batch. Each item is dispatched through the same handler a single create would
// use, so validation and business rules stay identical.

import { Router, IRequest } from 'itty-router';
import { Env, RequestContext } from '../types';
import { jsonResponse, errorResponse, generateId, getCurrentTimestamp } from '../utils';
import { billsRouter } from './bills';
import { usersRouter } from './users';
import { billersRouter } from './billers';
import { paymentMethodsRouter } from './payment-methods';

export const bulkRouter = Router();

const MAX_ITEMS = 50;

const TARGETS: Record<string, { path: string; handle: (req: Request, env: Env, ctx: RequestContext) => Promise<Response | undefined> }> = {
  bills: { path: '/v1/bills', handle: billsRouter.handle },
  users: { path: '/v1/users', handle: usersRouter.handle },
  billers: { path: '/v1/billers', handle: billersRouter.handle },
  'payment-methods': { path: '/v1/payment-methods', handle: paymentMethodsRouter.handle },
};

export const BULK_RESOURCES = Object.keys(TARGETS);

interface BulkItemResult {
  index: number;
  success: boolean;
  status: number;
  id?: string;
  location?: string;
  data?: unknown;
  error?: unknown;
}

bulkRouter.post('/v1/:resource/bulk', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const resourceName = request.params?.resource || '';
  const target = TARGETS[resourceName];

  if (!target) {
    return jsonResponse(
      errorResponse(
        'NOT_FOUND',
        `Bulk create is not available for '${resourceName}'. Supported resources: ${BULK_RESOURCES.join(', ')}`,
        requestId
      ),
      404,
      { 'X-Request-Id': requestId }
    );
  }

  let body: any;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return jsonResponse(
      errorResponse('MALFORMED_JSON', 'The request body is not valid JSON', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  // Accept either a bare array or { items: [...] }.
  const items: unknown[] = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [];

  if (items.length === 0) {
    return jsonResponse(
      errorResponse(
        'VALIDATION_ERROR',
        'Provide a non-empty array of items, either as the body itself or under an "items" member',
        requestId,
        [{ field: 'items', code: 'REQUIRED', message: 'items must be a non-empty array' }]
      ),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  if (items.length > MAX_ITEMS) {
    return jsonResponse(
      errorResponse(
        'PAYLOAD_TOO_LARGE',
        `A bulk request may contain at most ${MAX_ITEMS} items; received ${items.length}`,
        requestId
      ),
      413,
      { 'X-Request-Id': requestId }
    );
  }

  // `stopOnError: true` aborts the batch at the first failure.
  const stopOnError = body?.stopOnError === true;
  const origin = new URL(request.url).origin;
  const results: BulkItemResult[] = [];

  for (let index = 0; index < items.length; index++) {
    if (stopOnError && results.some((r) => !r.success)) {
      results.push({
        index,
        success: false,
        status: 0,
        error: { code: 'SKIPPED', message: 'Skipped because a previous item failed and stopOnError was set' },
      });
      continue;
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    const auth = request.headers.get('Authorization');
    const apiKey = request.headers.get('X-API-Key');
    if (auth) headers.set('Authorization', auth);
    if (apiKey) headers.set('X-API-Key', apiKey);

    const subRequest = new Request(`${origin}${target.path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(items[index]),
    });

    try {
      const response = await target.handle(subRequest, env, {
        ...(ctx as RequestContext),
        requestId: `${requestId}-${index}`,
      });

      if (!response) {
        results.push({
          index,
          success: false,
          status: 500,
          error: { code: 'NO_RESPONSE', message: 'The handler returned no response' },
        });
        continue;
      }

      const payload: any = await response.json().catch(() => null);
      const success = response.status >= 200 && response.status < 300;

      results.push({
        index,
        success,
        status: response.status,
        id: success ? payload?.data?.id : undefined,
        location: success && payload?.data?.id ? `${target.path}/${payload.data.id}` : undefined,
        data: success ? payload?.data : undefined,
        error: success ? undefined : payload?.error,
      });
    } catch (error: any) {
      results.push({
        index,
        success: false,
        status: 500,
        error: { code: 'INTERNAL_ERROR', message: String(error?.message || error) },
      });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.length - succeeded;

  return jsonResponse(
    {
      success: failed === 0,
      data: {
        resource: resourceName,
        summary: { total: results.length, succeeded, failed },
        results,
      },
      meta: {
        requestId,
        timestamp: getCurrentTimestamp(),
        version: env.API_VERSION || 'v1',
      },
    } as any,
    207,
    {
      'X-Request-Id': requestId,
      'X-Bulk-Succeeded': String(succeeded),
      'X-Bulk-Failed': String(failed),
    }
  );
});
