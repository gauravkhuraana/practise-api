// CORS Middleware - Allows cross-origin requests from Swagger UI

import { Env, RequestContext } from '../types';

const DEFAULT_ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'QUERY'];
const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-API-Key',
  'X-Request-Id',
  'X-Client-Id',
  'Accept',
  'Accept-Language',
  'Origin',
  // Conditional requests
  'If-Match',
  'If-None-Match',
  'If-Modified-Since',
  'If-Unmodified-Since',
  // Idempotent retries
  'Idempotency-Key',
  // Method override for clients that cannot send QUERY
  'X-HTTP-Method-Override',
  'Prefer',
];
const DEFAULT_EXPOSED_HEADERS = [
  'X-Request-Id',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
  'Retry-After',
  'Content-Length',
  // Conditional requests and caching
  'ETag',
  'Last-Modified',
  'Cache-Control',
  // Pagination and resource discovery
  'Link',
  'Location',
  'Allow',
  'Accept-Query',
  'Accept-Patch',
  'X-Total-Count',
  // Feature-specific signals
  'Idempotency-Key',
  'Idempotency-Replayed',
  'X-Query-Source',
  'X-Job-Id',
  'X-Job-Status',
  'X-Delivery-Id',
  'X-Bulk-Succeeded',
  'X-Bulk-Failed',
  'X-Response-Time-Ms',
];

export function corsHeaders(env: Env, origin?: string | null): Record<string, string> {
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) || ['*'];
  
  // Check if origin is allowed
  let allowOrigin = '*';
  if (origin) {
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      allowOrigin = origin;
    }
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': DEFAULT_ALLOWED_METHODS.join(', '),
    'Access-Control-Allow-Headers': DEFAULT_ALLOWED_HEADERS.join(', '),
    'Access-Control-Expose-Headers': DEFAULT_EXPOSED_HEADERS.join(', '),
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function handleCorsPreFlight(env: Env, request: Request): Response {
  const origin = request.headers.get('Origin');
  
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(env, origin),
      'Content-Length': '0',
    },
  });
}

/**
 * Add CORS headers to any response
 */
export function withCors(response: Response, env: Env, origin?: string | null): Response {
  const newHeaders = new Headers(response.headers);
  const cors = corsHeaders(env, origin);
  
  for (const [key, value] of Object.entries(cors)) {
    newHeaders.set(key, value);
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * CORS middleware function - wraps response with CORS headers
 */
export function corsMiddleware(env: Env, request: Request, response: Response): Response {
  const origin = request.headers.get('Origin');
  return withCors(response, env, origin);
}
