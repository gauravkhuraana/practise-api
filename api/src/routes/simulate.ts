// Simulation ("chaos") endpoints.
//
// These are deliberately unrealistic: they exist so an automation suite can
// exercise timeouts, retries, redirect handling, streaming, malformed payloads
// and arbitrary status codes without having to break a real business endpoint.
// Everything here is public - no authentication required.

import { Router, IRequest } from 'itty-router';
import { Env, RequestContext } from '../types';
import { jsonResponse, errorResponse, successResponse, generateId, getCurrentTimestamp } from '../utils';

export const simulateRouter = Router({ base: '/v1/simulate' });

const MAX_DELAY_MS = 30000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// GET /v1/simulate - Index of available simulations
// ============================================
simulateRouter.get('/', (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();

  return jsonResponse(
    successResponse(
      {
        description:
          'Endpoints for practising timeouts, retries, redirects, streaming and error handling. No authentication required.',
        endpoints: {
          'GET /v1/simulate/delay/{ms}': 'Respond after the given delay (max 30000ms).',
          'GET /v1/simulate/timeout': 'Hold the connection for 30s to trigger client timeouts.',
          'ANY /v1/simulate/status/{code}': 'Respond with the given HTTP status code.',
          'GET /v1/simulate/redirect/{n}': 'Follow a chain of n 302 redirects.',
          'GET /v1/simulate/redirect-to?url=': 'Redirect to an absolute URL (302 by default, ?status= to change).',
          'GET /v1/simulate/flaky?failureRate=0.5': 'Fail randomly with 503 and a Retry-After header.',
          'GET /v1/simulate/malformed-json': 'Return truncated JSON with a JSON content type.',
          'GET /v1/simulate/empty': 'Return 204 No Content.',
          'GET /v1/simulate/large?items=1000': 'Return a large JSON array.',
          'GET /v1/simulate/bytes/{n}': 'Return exactly n bytes of octet-stream data.',
          'GET /v1/simulate/stream?events=5': 'Server-sent events stream.',
          'ANY /v1/simulate/echo': 'Echo the request method, headers, query, cookies and body.',
          'GET /v1/simulate/cache/{seconds}': 'Return a cacheable response with the given max-age.',
          'GET /v1/simulate/basic-auth/{user}/{pass}': 'Challenge with 401 unless Basic credentials match.',
          'GET /v1/simulate/cookies/set?name=value': 'Set cookies from query parameters.',
          'GET /v1/simulate/headers?X-Custom=value': 'Reflect arbitrary response headers.',
        },
      },
      { requestId, version: env.API_VERSION }
    ),
    200,
    { 'X-Request-Id': requestId, 'Cache-Control': 'no-store' }
  );
});

// ============================================
// Delay and timeout
// ============================================
simulateRouter.all('/delay/:ms', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const requested = parseInt(request.params?.ms || '0', 10);
  const delayMs = Number.isFinite(requested) ? Math.min(MAX_DELAY_MS, Math.max(0, requested)) : 0;

  const startedAt = Date.now();
  await sleep(delayMs);

  return jsonResponse(
    successResponse(
      {
        requestedDelayMs: requested,
        appliedDelayMs: delayMs,
        actualDelayMs: Date.now() - startedAt,
        method: request.method,
      },
      { requestId, version: env.API_VERSION }
    ),
    200,
    { 'X-Request-Id': requestId, 'X-Delay-Ms': String(delayMs), 'Cache-Control': 'no-store' }
  );
});

simulateRouter.all('/timeout', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  await sleep(MAX_DELAY_MS);

  return jsonResponse(
    successResponse(
      { message: 'Your client waited the full 30 seconds without timing out.' },
      { requestId, version: env.API_VERSION }
    ),
    200,
    { 'X-Request-Id': requestId, 'Cache-Control': 'no-store' }
  );
});

// ============================================
// Arbitrary status codes
// ============================================
simulateRouter.all('/status/:code', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const code = parseInt(request.params?.code || '200', 10);

  if (!Number.isFinite(code) || code < 100 || code > 599) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Status code must be between 100 and 599', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  const headers: Record<string, string> = {
    'X-Request-Id': requestId,
    'X-Simulated-Status': String(code),
    'Cache-Control': 'no-store',
  };

  if (code === 401) headers['WWW-Authenticate'] = 'Bearer realm="billpay-api"';
  if (code === 405) headers.Allow = 'GET, POST, OPTIONS';
  if (code === 429 || code === 503) headers['Retry-After'] = '5';

  // 204 and 304 must not carry a body.
  if (code === 204 || code === 304) {
    return new Response(null, { status: code, headers });
  }

  const body =
    code >= 400
      ? errorResponse('SIMULATED_ERROR', `Simulated ${code} response`, requestId)
      : successResponse({ simulatedStatus: code }, { requestId, version: env.API_VERSION });

  return jsonResponse(body, code, headers);
});

// ============================================
// Redirects
// ============================================
simulateRouter.get('/redirect/:n', (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const remaining = parseInt(request.params?.n || '0', 10);

  if (!Number.isFinite(remaining) || remaining < 0 || remaining > 20) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Redirect count must be between 0 and 20', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  if (remaining === 0) {
    return jsonResponse(
      successResponse(
        { message: 'End of the redirect chain.', hops: 0 },
        { requestId, version: env.API_VERSION }
      ),
      200,
      { 'X-Request-Id': requestId, 'Cache-Control': 'no-store' }
    );
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: `/v1/simulate/redirect/${remaining - 1}`,
      'X-Request-Id': requestId,
      'X-Redirects-Remaining': String(remaining - 1),
      'Cache-Control': 'no-store',
    },
  });
});

simulateRouter.get('/redirect-to', (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  const status = parseInt(url.searchParams.get('status') || '302', 10);

  if (!target) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', "Query parameter 'url' is required", requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  const redirectStatus = [301, 302, 303, 307, 308].includes(status) ? status : 302;

  return new Response(null, {
    status: redirectStatus,
    headers: { Location: target, 'X-Request-Id': requestId, 'Cache-Control': 'no-store' },
  });
});

// ============================================
// Flaky endpoint - for retry logic
// ============================================
simulateRouter.all('/flaky', (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);
  const parsed = parseFloat(url.searchParams.get('failureRate') || '0.5');
  const failureRate = Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.5;

  if (Math.random() < failureRate) {
    return jsonResponse(
      errorResponse('SERVICE_UNAVAILABLE', 'Simulated transient failure. Retry the request.', requestId),
      503,
      { 'X-Request-Id': requestId, 'Retry-After': '1', 'X-Failure-Rate': String(failureRate), 'Cache-Control': 'no-store' }
    );
  }

  return jsonResponse(
    successResponse({ message: 'Request succeeded.', failureRate }, { requestId, version: env.API_VERSION }),
    200,
    { 'X-Request-Id': requestId, 'X-Failure-Rate': String(failureRate), 'Cache-Control': 'no-store' }
  );
});

// ============================================
// Malformed and edge-case payloads
// ============================================
simulateRouter.get('/malformed-json', (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();

  // Deliberately truncated - the content type lies about the body.
  return new Response('{"success": true, "data": {"id": "abc", "amount": 100', {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
      'X-Simulated-Defect': 'truncated-json',
      'Cache-Control': 'no-store',
    },
  });
});

simulateRouter.get('/empty', (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  return new Response(null, {
    status: 204,
    headers: { 'X-Request-Id': requestId, 'Cache-Control': 'no-store' },
  });
});

simulateRouter.get('/large', (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);
  const requested = parseInt(url.searchParams.get('items') || '1000', 10);
  const count = Number.isFinite(requested) ? Math.min(10000, Math.max(1, requested)) : 1000;

  const items = Array.from({ length: count }, (_, i) => ({
    id: `item-${String(i + 1).padStart(6, '0')}`,
    index: i,
    label: `Simulated record ${i + 1}`,
    amount: Math.round((i % 997) * 13.37 * 100) / 100,
    category: ['telecom', 'electricity', 'water', 'gas', 'broadband'][i % 5],
    createdAt: getCurrentTimestamp(),
  }));

  return jsonResponse(
    successResponse({ count, items }, { requestId, version: env.API_VERSION }),
    200,
    { 'X-Request-Id': requestId, 'X-Item-Count': String(count), 'Cache-Control': 'no-store' }
  );
});

simulateRouter.get('/bytes/:n', (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const requested = parseInt(request.params?.n || '1024', 10);
  const size = Number.isFinite(requested) ? Math.min(5_000_000, Math.max(0, requested)) : 1024;

  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) bytes[i] = i % 256;

  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(size),
      'X-Request-Id': requestId,
      'Cache-Control': 'no-store',
    },
  });
});

// ============================================
// Server-sent events
// ============================================
simulateRouter.get('/stream', (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);
  const requestedEvents = parseInt(url.searchParams.get('events') || '5', 10);
  const events = Number.isFinite(requestedEvents) ? Math.min(50, Math.max(1, requestedEvents)) : 5;
  const requestedInterval = parseInt(url.searchParams.get('intervalMs') || '500', 10);
  const intervalMs = Number.isFinite(requestedInterval)
    ? Math.min(5000, Math.max(0, requestedInterval))
    : 500;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 1; i <= events; i++) {
        const payload = JSON.stringify({
          sequence: i,
          total: events,
          status: i === events ? 'completed' : 'processing',
          timestamp: getCurrentTimestamp(),
        });
        controller.enqueue(encoder.encode(`id: ${i}\nevent: progress\ndata: ${payload}\n\n`));
        if (i < events) await sleep(intervalMs);
      }
      controller.enqueue(encoder.encode('event: done\ndata: {"message":"stream complete"}\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Request-Id': requestId,
    },
  });
});

// ============================================
// Request inspection
// ============================================
simulateRouter.all('/echo', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    // Never reflect credentials back to the caller.
    headers[key] = ['authorization', 'cookie', 'x-api-key'].includes(key.toLowerCase())
      ? '[redacted]'
      : value;
  });

  const cookies: Record<string, string> = {};
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    for (const part of cookieHeader.split(';')) {
      const [name, ...rest] = part.trim().split('=');
      if (name) cookies[name] = rest.join('=');
    }
  }

  let body: unknown = null;
  let bodyText: string | null = null;
  if (!['GET', 'HEAD'].includes(request.method)) {
    bodyText = await request.text();
    if (bodyText) {
      try {
        body = JSON.parse(bodyText);
        bodyText = null;
      } catch {
        body = null;
      }
    }
  }

  return jsonResponse(
    successResponse(
      {
        method: request.method,
        url: request.url,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
        headers,
        cookies,
        json: body,
        raw: bodyText,
        contentType: request.headers.get('Content-Type'),
        receivedAt: getCurrentTimestamp(),
      },
      { requestId, version: env.API_VERSION }
    ),
    200,
    { 'X-Request-Id': requestId, 'Cache-Control': 'no-store' }
  );
});

// ============================================
// Caching, auth challenges, cookies and headers
// ============================================
simulateRouter.get('/cache/:seconds', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const requested = parseInt(request.params?.seconds || '60', 10);
  const maxAge = Number.isFinite(requested) ? Math.min(86400, Math.max(0, requested)) : 60;

  const payload = { maxAge, generatedAt: getCurrentTimestamp() };
  const etag = `"cache-${maxAge}"`;

  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': `public, max-age=${maxAge}`, 'X-Request-Id': requestId },
    });
  }

  return jsonResponse(
    successResponse(payload, { requestId, version: env.API_VERSION }),
    200,
    {
      'X-Request-Id': requestId,
      ETag: etag,
      'Cache-Control': `public, max-age=${maxAge}`,
      'Last-Modified': new Date().toUTCString(),
    }
  );
});

simulateRouter.get('/basic-auth/:user/:pass', (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { user, pass } = request.params || {};
  const header = request.headers.get('Authorization') || '';

  if (!header.startsWith('Basic ')) {
    return jsonResponse(
      errorResponse('UNAUTHORIZED', 'Basic authentication required', requestId),
      401,
      { 'X-Request-Id': requestId, 'WWW-Authenticate': 'Basic realm="simulate"' }
    );
  }

  let decoded = '';
  try {
    decoded = atob(header.slice(6));
  } catch {
    decoded = '';
  }

  if (decoded !== `${user}:${pass}`) {
    return jsonResponse(
      errorResponse('UNAUTHORIZED', 'Invalid credentials', requestId),
      401,
      { 'X-Request-Id': requestId, 'WWW-Authenticate': 'Basic realm="simulate"' }
    );
  }

  return jsonResponse(
    successResponse({ authenticated: true, user }, { requestId, version: env.API_VERSION }),
    200,
    { 'X-Request-Id': requestId }
  );
});

simulateRouter.get('/cookies/set', (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);

  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-Request-Id': requestId,
    'Cache-Control': 'no-store',
  });

  const set: Record<string, string> = {};
  for (const [name, value] of url.searchParams.entries()) {
    set[name] = value;
    headers.append('Set-Cookie', `${name}=${value}; Path=/; SameSite=Lax`);
  }

  return new Response(
    JSON.stringify(successResponse({ cookiesSet: set }, { requestId, version: env.API_VERSION })),
    { status: 200, headers }
  );
});

simulateRouter.get('/headers', (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);

  const headers: Record<string, string> = {
    'X-Request-Id': requestId,
    'Cache-Control': 'no-store',
  };

  const reflected: Record<string, string> = {};
  for (const [name, value] of url.searchParams.entries()) {
    // Only reflect names that look like custom headers.
    if (/^[A-Za-z0-9-]+$/.test(name)) {
      headers[name] = value;
      reflected[name] = value;
    }
  }

  return jsonResponse(
    successResponse({ reflectedHeaders: reflected }, { requestId, version: env.API_VERSION }),
    200,
    headers
  );
});
