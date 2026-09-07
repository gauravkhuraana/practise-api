// Cloudflare Worker Entry Point
// Bill Payment API - Main Router

import { Router, IRequest } from 'itty-router';
import { Env, RequestContext } from './types';
import { generateId, errorResponse, jsonResponse, getCurrentTimestamp } from './utils';
import { authenticateRequest } from './middleware/auth';
import { handleCorsPreFlight, corsMiddleware } from './middleware/cors';
import { checkRateLimit, getRateLimitHeaders, rateLimitExceededResponse } from './middleware/rateLimit';

// Import route handlers
import { billersRouter } from './routes/billers';
import { billsRouter } from './routes/bills';
import { paymentsRouter } from './routes/payments';
import { paymentMethodsRouter } from './routes/payment-methods';
import { usersRouter } from './routes/users';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { filesRouter } from './routes/files';
import { jobsRouter } from './routes/jobs';
import { simulateRouter } from './routes/simulate';
import { webhooksRouter } from './routes/webhooks';
import { bulkRouter } from './routes/bulk';

// Protocol-level features
import { handleResourceQuery, querySchemaFor, QUERYABLE_RESOURCE_NAMES, ACCEPT_QUERY } from './routes/query';
import { QUERYABLE_RESOURCES } from './lib/resources';
import { evaluatePreconditions, applyResponseValidators } from './lib/conditional';
import { checkIdempotency, storeIdempotentResponse } from './lib/idempotency';
import { rewriteJsonPatchRequest, JSON_PATCH_CONTENT_TYPE } from './lib/jsonPatch';
import { applyFieldProjection, buildLinkHeader, methodNotAllowed } from './lib/http';

// Create main router
const router = Router();

// ============================================
// Helper: Get client IP
// ============================================
function getClientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Real-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
    '127.0.0.1'
  );
}

// ============================================
// Middleware: Request Context Setup
// ============================================
function setupRequestContext(request: IRequest): RequestContext {
  const requestId = request.headers.get('X-Request-Id') || generateId();
  return {
    requestId,
    startTime: Date.now(),
    clientIp: getClientIp(request),
  };
}

// ============================================
// Method resolution
// ============================================

const OVERRIDABLE_METHODS = ['QUERY', 'PUT', 'PATCH', 'DELETE'];

/**
 * Resolve the method the caller intends.
 *
 * Some proxies and HTTP clients still reject unfamiliar verbs such as QUERY,
 * so `X-HTTP-Method-Override` (or `?_method=`) on a POST is honoured as an
 * equivalent request. Only safe-to-override verbs are accepted.
 */
function getEffectiveMethod(request: Request, url: URL): string {
  if (request.method !== 'POST') return request.method;

  const override = (
    request.headers.get('X-HTTP-Method-Override') ||
    url.searchParams.get('_method') ||
    ''
  )
    .trim()
    .toUpperCase();

  return OVERRIDABLE_METHODS.includes(override) ? override : 'POST';
}

// ============================================
// Allowed methods per route shape (for 405 + OPTIONS discovery)
// ============================================

const COLLECTION_METHODS: Record<string, string[]> = {
  billers: ['GET', 'POST', 'QUERY', 'HEAD', 'OPTIONS'],
  bills: ['GET', 'POST', 'QUERY', 'HEAD', 'OPTIONS'],
  payments: ['GET', 'POST', 'QUERY', 'HEAD', 'OPTIONS'],
  users: ['GET', 'POST', 'QUERY', 'HEAD', 'OPTIONS'],
  'payment-methods': ['GET', 'POST', 'HEAD', 'OPTIONS'],
  files: ['GET', 'POST', 'HEAD', 'OPTIONS'],
  jobs: ['GET', 'POST', 'HEAD', 'OPTIONS'],
  webhooks: ['GET', 'POST', 'HEAD', 'OPTIONS'],
};

const ITEM_METHODS: Record<string, string[]> = {
  billers: ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  bills: ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  payments: ['GET', 'DELETE', 'HEAD', 'OPTIONS'],
  users: ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  'payment-methods': ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  files: ['GET', 'DELETE', 'HEAD', 'OPTIONS'],
  jobs: ['GET', 'DELETE', 'HEAD', 'OPTIONS'],
  webhooks: ['GET', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
};

/** Methods supported at a path, or null when the path is not a known resource. */
function allowedMethodsFor(pathname: string): string[] | null {
  const collection = pathname.match(/^\/v1\/([a-z-]+)\/?$/);
  if (collection) return COLLECTION_METHODS[collection[1]] || null;

  const item = pathname.match(/^\/v1\/([a-z-]+)\/([^/]+)\/?$/);
  if (item) {
    // Reserved sub-paths are handled by their own routes.
    if (['bulk', 'query', 'query-schema', 'categories', 'summary', 'overdue', 'stats', 'types', 'events', 'upload'].includes(item[2])) {
      return null;
    }
    return ITEM_METHODS[item[1]] || null;
  }

  return null;
}

// ============================================
// Routes: Health Check (No Auth Required)
// ============================================
router.all('/health*', healthRouter.handle);
router.all('/v1/health*', healthRouter.handle);

// ============================================
// Routes: Auth/Token (OAuth2 demo endpoints)
// ============================================
router.all('/v1/auth/*', authRouter.handle);
router.all('/oauth/*', authRouter.handle);

// ============================================
// Routes: Simulation / chaos endpoints (No Auth Required)
// ============================================
router.all('/v1/simulate*', simulateRouter.handle);

// ============================================
// Routes: QUERY discovery
// ============================================
router.get('/v1/query-schema', (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  return jsonResponse(
    {
      success: true,
      data: querySchemaFor(),
      meta: { requestId, timestamp: getCurrentTimestamp(), version: env.API_VERSION || 'v1' },
    } as any,
    200,
    { 'X-Request-Id': requestId }
  );
});

router.get('/v1/:resource/query-schema', (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const resource = request.params?.resource || '';

  if (!QUERYABLE_RESOURCES[resource]) {
    return jsonResponse(
      errorResponse(
        'NOT_FOUND',
        `'${resource}' does not support QUERY. Queryable resources: ${QUERYABLE_RESOURCE_NAMES.join(', ')}`,
        requestId
      ),
      404,
      { 'X-Request-Id': requestId }
    );
  }

  return jsonResponse(
    {
      success: true,
      data: querySchemaFor(resource),
      meta: { requestId, timestamp: getCurrentTimestamp(), version: env.API_VERSION || 'v1' },
    } as any,
    200,
    { 'X-Request-Id': requestId }
  );
});

// ============================================
// Routes: Bulk create - registered before the resource routers so that
// /v1/bills/bulk is not swallowed by /v1/bills/:id
// ============================================
router.post('/v1/:resource/bulk', bulkRouter.handle);

// ============================================
// API v1 Routes
// ============================================
router.all('/v1/billers*', billersRouter.handle);
router.all('/v1/bills*', billsRouter.handle);
router.all('/v1/payments*', paymentsRouter.handle);
router.all('/v1/payment-methods*', paymentMethodsRouter.handle);
router.all('/v1/users*', usersRouter.handle);
router.all('/v1/files*', filesRouter.handle);
router.all('/v1/jobs*', jobsRouter.handle);
router.all('/v1/webhooks*', webhooksRouter.handle);

// ============================================
// Root endpoint
// ============================================
router.get('/', (request: IRequest, env: Env) => {
  const ctx = setupRequestContext(request);
  return jsonResponse({
    success: true,
    data: {
      name: 'Bill Payment API',
      version: 'v1',
      description: 'RESTful API for bill payment operations - Practice automation testing',
      documentation: 'https://yourusername.github.io/APIAutomation/',
      endpoints: {
        health: '/health',
        billers: '/v1/billers',
        bills: '/v1/bills',
        payments: '/v1/payments',
        paymentMethods: '/v1/payment-methods',
        users: '/v1/users',
        auth: '/v1/auth',
        files: '/v1/files',
        jobs: '/v1/jobs',
        webhooks: '/v1/webhooks',
        simulate: '/v1/simulate',
        querySchema: '/v1/query-schema',
      },
      authentication: {
        apiKey: 'X-API-Key header or api_key query parameter',
        bearer: 'Authorization: Bearer <token>',
        basic: 'Authorization: Basic <base64>',
        cookie: 'Cookie: session_id=<session-token>',
      },
      demoCredentials: {
        apiKey: 'demo-api-key-123',
        bearerToken: 'demo-jwt-token-456',
        basicAuth: 'demo:password123 (base64: ZGVtbzpwYXNzd29yZDEyMw==)',
        sessionCookie: 'session_id=demo-session-abc123',
      },
      contentTypes: {
        json: 'application/json (default)',
        xml: 'application/xml (set Accept header)',
        formUrlEncoded: 'application/x-www-form-urlencoded (OAuth token)',
        multipartFormData: 'multipart/form-data (file uploads)',
        jsonPatch: 'application/json-patch+json (RFC 6902 PATCH)',
        queryJson: 'application/query+json (HTTP QUERY body)',
      },
      httpMethods: {
        standard: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        query: {
          description:
            'QUERY is a safe, idempotent method that carries a request body. See /v1/query-schema.',
          native: `QUERY /v1/{${QUERYABLE_RESOURCE_NAMES.join('|')}}`,
          pathFallback: 'POST /v1/{resource}/query',
          headerOverride: 'POST /v1/{resource} with X-HTTP-Method-Override: QUERY',
        },
      },
      protocolFeatures: {
        conditionalRequests: 'ETag / Last-Modified, If-None-Match (304), If-Match (412)',
        idempotency: 'Idempotency-Key header on POST /v1/payments',
        asyncJobs: '202 Accepted + Location + Retry-After, poll GET /v1/jobs/{id}',
        pagination: 'page/limit, offset/limit, cursor, plus an RFC 8288 Link header',
        sorting: '?sort=-amount,dueDate',
        sparseFieldsets: '?fields=id,amount,status',
        bulkCreate: 'POST /v1/{resource}/bulk returns 207 Multi-Status',
        webhooks: 'Signed callbacks with a delivery log at /v1/webhooks',
        simulation: 'Delays, status codes, redirects, SSE and malformed payloads at /v1/simulate',
      },
    },
    meta: {
      requestId: ctx.requestId,
      timestamp: getCurrentTimestamp(),
      version: 'v1',
    },
  }, 200, { 'X-Request-Id': ctx.requestId });
});

// ============================================
// 404 Handler
// ============================================
router.all('*', (request: IRequest) => {
  const ctx = setupRequestContext(request);
  return jsonResponse(
    errorResponse(
      'NOT_FOUND',
      `The requested endpoint ${request.method} ${new URL(request.url).pathname} was not found`,
      ctx.requestId
    ),
    404,
    { 'X-Request-Id': ctx.requestId }
  );
});

// ============================================
// Response post-processing
// ============================================

/**
 * Apply representation-level concerns that every JSON endpoint shares:
 * a sparse fieldset projection and an RFC 8288 Link header for paginated lists.
 */
async function postProcessResponse(request: Request, url: URL, response: Response): Promise<Response> {
  if (response.status === 204 || response.status === 304) return response;

  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) return response;

  const fieldsParam = url.searchParams.get('fields');
  const needsLink = !response.headers.has('Link');
  if (!fieldsParam && !needsLink) return response;

  let envelope: any;
  const text = await response.clone().text();
  try {
    envelope = JSON.parse(text);
  } catch {
    return response;
  }

  const headers = new Headers(response.headers);
  let changed = false;

  const pagination = envelope?.meta?.pagination;
  if (needsLink && pagination && typeof pagination.page === 'number') {
    const link = buildLinkHeader(url, pagination);
    if (link) {
      headers.set('Link', link);
      headers.set('X-Total-Count', String(pagination.total ?? 0));
      changed = true;
    }
  }

  if (fieldsParam && envelope?.data !== undefined) {
    envelope = applyFieldProjection(envelope, fieldsParam);
    changed = true;
    return new Response(JSON.stringify(envelope), { status: response.status, headers });
  }

  if (!changed) return response;
  return new Response(text, { status: response.status, headers });
}

// ============================================
// Main Worker Export
// ============================================
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestContext = setupRequestContext(request as IRequest);
    const url = new URL(request.url);

    try {
      const effectiveMethod = getEffectiveMethod(request, url);

      // ----- CORS preflight -----
      if (request.method === 'OPTIONS') {
        const preflight = handleCorsPreFlight(env, request);
        const allowed = allowedMethodsFor(url.pathname);
        if (!allowed) return preflight;

        // `Allow` states what this resource actually supports, which is the
        // HTTP semantics a client should read. `Access-Control-Allow-Methods` is
        // left at the full transport allow-list on purpose: narrowing it would
        // make the browser block the request before it was sent, so a browser
        // client could never receive the honest 405 that says the method is
        // wrong. CORS decides what may be sent; Allow describes what is supported.
        const headers = new Headers(preflight.headers);
        headers.set('Allow', allowed.join(', '));
        if (allowed.includes('QUERY')) {
          // Same list the QUERY handler advertises, so OPTIONS and the response
          // headers can never drift apart.
          headers.set('Accept-Query', ACCEPT_QUERY);
        }
        headers.set('Accept-Patch', 'application/json, application/json-patch+json');
        return new Response(null, { status: 204, headers });
      }

      // ----- Rate limiting -----
      const rateLimitResult = await checkRateLimit(requestContext.clientIp, env);
      if (!rateLimitResult.allowed) {
        const response = rateLimitExceededResponse(rateLimitResult, requestContext.requestId);
        return corsMiddleware(env, request, response);
      }

      // ----- Authentication -----
      const publicPaths = ['/health', '/v1/health', '/', '/oauth/token', '/v1/auth/token', '/v1/simulate'];
      const isPublicPath = publicPaths.some(p => url.pathname === p || url.pathname.startsWith(p + '/'));

      if (!isPublicPath) {
        const authResult = authenticateRequest(request, env);
        if (!authResult.success) {
          const response = jsonResponse(
            errorResponse(
              authResult.error?.code || 'UNAUTHORIZED',
              authResult.error?.message || 'Authentication failed',
              requestContext.requestId
            ),
            401,
            {
              'X-Request-Id': requestContext.requestId,
              'WWW-Authenticate': 'Bearer realm="billpay-api", Basic realm="billpay-api"',
            }
          );
          return corsMiddleware(env, request, response);
        }
        requestContext.auth = authResult.context;
      }

      // ----- HTTP QUERY -----
      // Native `QUERY /v1/{resource}`, or POST with X-HTTP-Method-Override: QUERY.
      if (effectiveMethod === 'QUERY') {
        const collection = url.pathname.match(/^\/v1\/([a-z-]+)\/?$/);
        const source = request.method === 'QUERY' ? 'query-method' : 'method-override';

        if (collection && QUERYABLE_RESOURCES[collection[1]]) {
          const response = await handleResourceQuery(
            request,
            env,
            requestContext,
            collection[1],
            source
          );
          return finalize(env, request, response, rateLimitResult, requestContext);
        }

        const response = jsonResponse(
          errorResponse(
            'METHOD_NOT_ALLOWED',
            `QUERY is not supported at ${url.pathname}. Queryable collections: ${QUERYABLE_RESOURCE_NAMES.map((r) => `/v1/${r}`).join(', ')}`,
            requestContext.requestId
          ),
          405,
          { 'X-Request-Id': requestContext.requestId, Allow: 'GET, POST, HEAD, OPTIONS' }
        );
        return finalize(env, request, response, rateLimitResult, requestContext);
      }

      // ----- QUERY path fallback: POST /v1/{resource}/query -----
      const queryPath = url.pathname.match(/^\/v1\/([a-z-]+)\/query\/?$/);
      if (request.method === 'POST' && queryPath && QUERYABLE_RESOURCES[queryPath[1]]) {
        const response = await handleResourceQuery(
          request,
          env,
          requestContext,
          queryPath[1],
          'query-path'
        );
        return finalize(env, request, response, rateLimitResult, requestContext);
      }

      // ----- Conditional requests: If-Match / If-Unmodified-Since -----
      const preconditionFailure = await evaluatePreconditions(
        env,
        request,
        url,
        requestContext.requestId
      );
      if (preconditionFailure) {
        return finalize(env, request, preconditionFailure, rateLimitResult, requestContext);
      }

      // ----- JSON Patch (RFC 6902) -----
      let routedRequest: Request = request;
      const contentType = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();

      if (request.method === 'PATCH' && contentType === JSON_PATCH_CONTENT_TYPE) {
        const rewritten = await rewriteJsonPatchRequest(env, request, url, requestContext);
        if (rewritten.response) {
          return finalize(env, request, rewritten.response, rateLimitResult, requestContext);
        }
        if (rewritten.request) routedRequest = rewritten.request;
      }

      // ----- Idempotency-Key on payment creation -----
      let idempotencyKey: string | undefined;
      let idempotencyFingerprint: string | undefined;
      const isPaymentCreate =
        request.method === 'POST' && /^\/v1\/payments\/?$/.test(url.pathname);

      if (isPaymentCreate) {
        const bodyText = await routedRequest.text();
        const check = await checkIdempotency(
          env,
          request,
          url.pathname,
          bodyText,
          requestContext.requestId
        );

        if (check.shortCircuit) {
          return finalize(env, request, check.shortCircuit, rateLimitResult, requestContext);
        }

        idempotencyKey = check.key;
        idempotencyFingerprint = check.fingerprint;

        // The body was consumed above, so rebuild the request for routing.
        routedRequest = new Request(routedRequest.url, {
          method: 'POST',
          headers: routedRequest.headers,
          body: bodyText,
        });
      }

      // ----- Route the request -----
      let response = await router.handle(routedRequest, env, requestContext);

      if (!response) {
        response = jsonResponse(
          errorResponse('NOT_FOUND', 'Endpoint not found', requestContext.requestId),
          404
        );
      }

      // ----- 405 instead of 404 for a known resource with an unsupported method -----
      if (response.status === 404) {
        const allowed = allowedMethodsFor(url.pathname);
        if (allowed && !allowed.includes(request.method)) {
          response = methodNotAllowed(requestContext.requestId, request.method, allowed);
        }
      }

      // ----- Persist the idempotent response -----
      if (idempotencyKey && idempotencyFingerprint) {
        const body = await response.clone().text();
        let resourceId: string | undefined;
        try {
          resourceId = JSON.parse(body)?.data?.id;
        } catch {
          resourceId = undefined;
        }

        await storeIdempotentResponse(
          env,
          idempotencyKey,
          idempotencyFingerprint,
          url.pathname,
          response.status,
          body,
          resourceId
        );

        const headers = new Headers(response.headers);
        headers.set('Idempotency-Key', idempotencyKey);
        headers.set('Idempotency-Replayed', 'false');
        response = new Response(body, { status: response.status, headers });
      }

      // ----- Representation concerns -----
      response = await applyResponseValidators(request, url, response);
      response = await postProcessResponse(request, url, response);

      return finalize(env, request, response, rateLimitResult, requestContext);
    } catch (error) {
      console.error('Unhandled error:', error);
      const response = jsonResponse(
        errorResponse(
          'INTERNAL_ERROR',
          'An unexpected error occurred',
          requestContext.requestId
        ),
        500,
        { 'X-Request-Id': requestContext.requestId }
      );
      return corsMiddleware(env, request, response);
    }
  },

  // Scheduled handler for weekly data reset (optional)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Running scheduled data reset...');
    // Execute reset and seed SQL
    try {
      // This would run the reset logic - simplified for demo
      await env.DB.exec(`DELETE FROM webhook_deliveries`);
      await env.DB.exec(`DELETE FROM webhook_subscriptions WHERE created_by != 'system'`);
      await env.DB.exec(`DELETE FROM jobs`);
      await env.DB.exec(`DELETE FROM idempotency_keys`);
      await env.DB.exec(`DELETE FROM transactions WHERE created_by != 'system'`);
      await env.DB.exec(`DELETE FROM payments WHERE created_by != 'system'`);
      await env.DB.exec(`DELETE FROM bills WHERE created_by != 'system'`);
      await env.DB.exec(`DELETE FROM payment_methods WHERE created_by != 'system'`);
      await env.DB.exec(`DELETE FROM users WHERE created_by != 'system'`);
      await env.DB.exec(`DELETE FROM rate_limits`);
      console.log('Data reset completed successfully');
    } catch (error) {
      console.error('Data reset failed:', error);
    }
  },
};

// ============================================
// Shared response finalisation: CORS, rate limit headers, request id
// ============================================
function finalize(
  env: Env,
  request: Request,
  response: Response,
  rateLimitResult: Parameters<typeof getRateLimitHeaders>[0],
  requestContext: RequestContext
): Response {
  const withCors = corsMiddleware(env, request, response);
  const headers = new Headers(withCors.headers);

  for (const [key, value] of Object.entries(getRateLimitHeaders(rateLimitResult))) {
    headers.set(key, value);
  }
  headers.set('X-Request-Id', requestContext.requestId);
  headers.set('X-Response-Time-Ms', String(Date.now() - requestContext.startTime));

  // 204 and 304 must not carry a body.
  if (withCors.status === 204 || withCors.status === 304) {
    return new Response(null, { status: withCors.status, headers });
  }

  return new Response(withCors.body, { status: withCors.status, headers });
}
