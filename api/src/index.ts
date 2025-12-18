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
// API v1 Routes
// ============================================
router.all('/v1/billers*', billersRouter.handle);
router.all('/v1/bills*', billsRouter.handle);
router.all('/v1/payments*', paymentsRouter.handle);
router.all('/v1/payment-methods*', paymentMethodsRouter.handle);
router.all('/v1/users*', usersRouter.handle);

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
      },
      authentication: {
        apiKey: 'X-API-Key header or api_key query parameter',
        bearer: 'Authorization: Bearer <token>',
        basic: 'Authorization: Basic <base64>',
      },
      demoCredentials: {
        apiKey: 'demo-api-key-123',
        bearerToken: 'demo-jwt-token-456',
        basicAuth: 'demo:password123 (base64: ZGVtbzpwYXNzd29yZDEyMw==)',
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
// Main Worker Export
// ============================================
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestContext = setupRequestContext(request as IRequest);
    const url = new URL(request.url);

    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return handleCorsPreFlight(env, request);
      }

      // Rate limiting
      const rateLimitResult = await checkRateLimit(requestContext.clientIp, env);
      if (!rateLimitResult.allowed) {
        const response = rateLimitExceededResponse(rateLimitResult, requestContext.requestId);
        return corsMiddleware(env, request, response);
      }

      // Skip auth for certain endpoints
      const publicPaths = ['/health', '/v1/health', '/', '/oauth/token', '/v1/auth/token'];
      const isPublicPath = publicPaths.some(p => url.pathname === p || url.pathname.startsWith(p + '/'));
      
      if (!isPublicPath) {
        // Authenticate request
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

      // Route the request
      const response = await router.handle(request, env, requestContext);

      // Add CORS and rate limit headers
      const finalResponse = corsMiddleware(
        env,
        request,
        response || jsonResponse(
          errorResponse('NOT_FOUND', 'Endpoint not found', requestContext.requestId),
          404
        )
      );

      // Add rate limit headers
      const headers = new Headers(finalResponse.headers);
      const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
      for (const [key, value] of Object.entries(rateLimitHeaders)) {
        headers.set(key, value);
      }
      headers.set('X-Request-Id', requestContext.requestId);

      return new Response(finalResponse.body, {
        status: finalResponse.status,
        headers,
      });
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
