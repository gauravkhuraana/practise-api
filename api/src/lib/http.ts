// HTTP protocol helpers: entity tags, conditional requests, RFC 8288 Link
// headers and 405 Method Not Allowed responses.

import { errorResponse, jsonResponse } from '../utils';
import { PaginationMeta } from '../types';

// ============================================
// Entity tags
// ============================================

/** SHA-256 based strong ETag over an arbitrary payload. */
export async function computeEtag(payload: unknown, weak = false): Promise<string> {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const hex = Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${weak ? 'W/' : ''}"${hex}"`;
}

/** Stable ETag for a single stored row, derived from its id and version stamp. */
export async function rowEtag(row: { id?: unknown; updated_at?: unknown }): Promise<string> {
  return computeEtag(`${String(row.id)}:${String(row.updated_at ?? '')}`);
}

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^W\//, '');
}

/**
 * Evaluate an If-None-Match / If-Match header value against a current ETag.
 * Comparison is weak, per RFC 9110 for If-None-Match.
 */
export function etagMatches(headerValue: string | null, currentEtag: string): boolean {
  if (!headerValue) return false;
  if (headerValue.trim() === '*') return true;
  const current = normalizeTag(currentEtag);
  return headerValue
    .split(',')
    .map(normalizeTag)
    .some((candidate) => candidate === current);
}

/** 304 Not Modified — a body is not allowed on this status. */
export function notModified(etag: string, extraHeaders: Record<string, string> = {}): Response {
  return new Response(null, {
    status: 304,
    headers: {
      ETag: etag,
      'Cache-Control': 'private, max-age=0, must-revalidate',
      ...extraHeaders,
    },
  });
}

/** 412 Precondition Failed — the client's If-Match did not match current state. */
export function preconditionFailed(
  requestId: string,
  currentEtag: string,
  message = 'The resource has changed since the version identified by your If-Match header.'
): Response {
  return jsonResponse(
    errorResponse('PRECONDITION_FAILED', message, requestId),
    412,
    { 'X-Request-Id': requestId, ETag: currentEtag }
  );
}

// ============================================
// 405 Method Not Allowed
// ============================================

export function methodNotAllowed(
  requestId: string,
  method: string,
  allowedMethods: string[]
): Response {
  return jsonResponse(
    errorResponse(
      'METHOD_NOT_ALLOWED',
      `The ${method} method is not supported on this resource. Supported methods: ${allowedMethods.join(', ')}`,
      requestId
    ),
    405,
    {
      'X-Request-Id': requestId,
      Allow: allowedMethods.join(', '),
    }
  );
}

// ============================================
// RFC 8288 Link header pagination
// ============================================

function pageUrl(url: URL, page: number): string {
  const next = new URL(url.toString());
  next.searchParams.delete('cursor');
  next.searchParams.delete('offset');
  next.searchParams.set('page', String(page));
  return next.toString();
}

/**
 * Build a Link header from pagination metadata.
 * Emits first/prev/next/last relations, omitting any that do not apply.
 */
export function buildLinkHeader(url: URL, pagination: PaginationMeta): string | null {
  const { page, totalPages } = pagination;
  if (!totalPages || totalPages < 1) return null;

  const links: string[] = [];
  links.push(`<${pageUrl(url, 1)}>; rel="first"`);
  if (pagination.hasPrev) links.push(`<${pageUrl(url, page - 1)}>; rel="prev"`);
  if (pagination.hasNext) links.push(`<${pageUrl(url, page + 1)}>; rel="next"`);
  links.push(`<${pageUrl(url, totalPages)}>; rel="last"`);

  return links.join(', ');
}

// ============================================
// Sparse fieldsets applied to a response envelope
// ============================================

function project(item: unknown, fields: string[]): unknown {
  if (typeof item !== 'object' || item === null) return item;
  const source = item as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in source) out[field] = source[field];
  }
  return out;
}

/**
 * Apply a `?fields=` projection to the `data` member of a response envelope.
 * `id` is always retained so results stay addressable.
 */
export function applyFieldProjection(envelope: any, fieldsParam: string): any {
  const fields = fieldsParam
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);

  if (fields.length === 0) return envelope;
  if (!fields.includes('id')) fields.unshift('id');
  if (!envelope || typeof envelope !== 'object' || envelope.data === undefined) return envelope;

  envelope.data = Array.isArray(envelope.data)
    ? envelope.data.map((item: unknown) => project(item, fields))
    : project(envelope.data, fields);

  if (envelope.meta && typeof envelope.meta === 'object') {
    envelope.meta.fields = fields;
  }

  return envelope;
}
