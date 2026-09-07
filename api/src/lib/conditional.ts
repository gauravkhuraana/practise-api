// Conditional request handling (RFC 9110 section 13).
//
// Runs before the route handler so that If-Match and If-Unmodified-Since can
// reject a stale update with 412 without any route needing to know about it.

import { Env } from '../types';
import { rowEtag, etagMatches, preconditionFailed } from './http';
import { errorResponse, jsonResponse } from '../utils';

/** URL segment -> table name for resources that support conditional requests. */
const CONDITIONAL_RESOURCES: Record<string, string> = {
  billers: 'billers',
  bills: 'bills',
  payments: 'payments',
  users: 'users',
  'payment-methods': 'payment_methods',
};

const UNSAFE_METHODS = ['PUT', 'PATCH', 'DELETE'];

interface ResolvedResource {
  table: string;
  id: string;
}

/** Match /v1/{resource}/{id} exactly - sub-resources are out of scope. */
function resolve(pathname: string): ResolvedResource | null {
  const match = pathname.match(/^\/v1\/([a-z-]+)\/([^/]+)\/?$/);
  if (!match) return null;

  const table = CONDITIONAL_RESOURCES[match[1]];
  if (!table) return null;

  return { table, id: decodeURIComponent(match[2]) };
}

/**
 * Evaluate If-Match / If-Unmodified-Since for an unsafe request.
 * Returns a 412 or 404 response when the request must not proceed, else null.
 */
export async function evaluatePreconditions(
  env: Env,
  request: Request,
  url: URL,
  requestId: string
): Promise<Response | null> {
  if (!UNSAFE_METHODS.includes(request.method)) return null;

  const ifMatch = request.headers.get('If-Match');
  const ifUnmodifiedSince = request.headers.get('If-Unmodified-Since');
  if (!ifMatch && !ifUnmodifiedSince) return null;

  const target = resolve(url.pathname);
  if (!target) return null;

  let row: any;
  try {
    row = await env.DB.prepare(`SELECT id, updated_at FROM ${target.table} WHERE id = ?`)
      .bind(target.id)
      .first();
  } catch (error) {
    console.error('Precondition lookup failed:', error);
    return null;
  }

  if (!row) {
    // If-Match: * against a resource that does not exist must fail the precondition.
    if (ifMatch) {
      return jsonResponse(
        errorResponse(
          'PRECONDITION_FAILED',
          `Cannot evaluate If-Match: resource '${target.id}' does not exist`,
          requestId
        ),
        412,
        { 'X-Request-Id': requestId }
      );
    }
    return null;
  }

  const currentEtag = await rowEtag(row);

  if (ifMatch && !etagMatches(ifMatch, currentEtag)) {
    return preconditionFailed(requestId, currentEtag);
  }

  if (ifUnmodifiedSince) {
    const since = Date.parse(ifUnmodifiedSince);
    const updatedAt = Date.parse(String(row.updated_at ?? ''));
    if (Number.isFinite(since) && Number.isFinite(updatedAt) && updatedAt > since) {
      return preconditionFailed(
        requestId,
        currentEtag,
        'The resource has been modified since the date given in your If-Unmodified-Since header.'
      );
    }
  }

  return null;
}

/**
 * Attach validators to a successful single-resource GET response, and turn it
 * into a 304 when the client's If-None-Match already matches.
 */
export async function applyResponseValidators(
  request: Request,
  url: URL,
  response: Response
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return response;
  if (response.status !== 200) return response;
  if (response.headers.has('ETag')) return response;
  if (!resolve(url.pathname)) return response;

  const body = await response.clone().text();

  // The ETag must be derived from the stored row version, not from the response
  // body: the envelope carries a fresh requestId and timestamp on every call, so
  // a content hash would change even when the resource has not. Deriving it the
  // same way as evaluatePreconditions also means an ETag handed out by GET can
  // be sent straight back in If-Match.
  let id: unknown;
  let updatedAt: unknown;
  let lastModified: string | null = null;

  try {
    const parsed = JSON.parse(body);
    id = parsed?.data?.id;
    updatedAt = parsed?.data?.updatedAt ?? parsed?.data?.createdAt;
    if (updatedAt) {
      const date = new Date(String(updatedAt));
      if (!Number.isNaN(date.getTime())) lastModified = date.toUTCString();
    }
  } catch {
    // Not a JSON envelope - there is nothing stable to build a validator from.
    return response;
  }

  if (id === undefined || updatedAt === undefined) return response;

  const etag = await rowEtag({ id, updated_at: updatedAt });

  if (etagMatches(request.headers.get('If-None-Match'), etag)) {
    const headers: Record<string, string> = {};
    if (lastModified) headers['Last-Modified'] = lastModified;
    const requestId = response.headers.get('X-Request-Id');
    if (requestId) headers['X-Request-Id'] = requestId;

    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': 'private, max-age=0, must-revalidate',
        ...headers,
      },
    });
  }

  const headers = new Headers(response.headers);
  headers.set('ETag', etag);
  headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
  headers.set('Vary', 'Accept, Authorization, X-API-Key');
  if (lastModified) headers.set('Last-Modified', lastModified);

  return new Response(body, { status: response.status, headers });
}
