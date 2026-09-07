// HTTP QUERY method support.
//
// QUERY is a safe, idempotent HTTP method that carries a request body, so a
// search can be expressed as structured JSON instead of being crammed into a
// query string. Because some intermediaries still reject unknown methods, this
// API accepts the same request three ways:
//
//   1. QUERY /v1/bills                            (native)
//   2. POST  /v1/bills/query                      (path fallback)
//   3. POST  /v1/bills  + X-HTTP-Method-Override: QUERY   (header override)
//
// All three run the identical handler and return the identical body, which
// makes this a useful place to practise method overrides and content
// negotiation alongside complex request bodies.

import { Env, RequestContext } from '../types';
import {
  jsonResponse,
  errorResponse,
  paginatedResponse,
  calculatePagination,
  generateId,
} from '../utils';
import { compileQuery, projectFields, QueryInput } from '../lib/query';
import { QUERYABLE_RESOURCES } from '../lib/resources';
import { computeEtag, etagMatches, notModified, buildLinkHeader } from '../lib/http';

export type QuerySource = 'query-method' | 'method-override' | 'query-path';

const ACCEPTED_CONTENT_TYPES = [
  'application/json',
  'application/query+json',
  'text/json',
];

// RFC 10008 section 4: Accept-Query is a Structured Fields List of Tokens or
// Strings holding the media ranges this resource accepts for QUERY, without
// parameters. Media types are valid SF tokens, so the plain list is conformant.
export const ACCEPT_QUERY = ACCEPTED_CONTENT_TYPES.join(', ');

/** Resource names that expose QUERY, for discovery responses. */
export const QUERYABLE_RESOURCE_NAMES = Object.keys(QUERYABLE_RESOURCES);

export async function handleResourceQuery(
  request: Request,
  env: Env,
  ctx: RequestContext | undefined,
  resourceName: string,
  source: QuerySource
): Promise<Response> {
  const requestId = ctx?.requestId || generateId();
  const resource = QUERYABLE_RESOURCES[resourceName];

  if (!resource) {
    return jsonResponse(
      errorResponse(
        'NOT_FOUND',
        `QUERY is not supported for '${resourceName}'. Queryable resources: ${QUERYABLE_RESOURCE_NAMES.join(', ')}`,
        requestId
      ),
      404,
      { 'X-Request-Id': requestId }
    );
  }

  // ----- Content negotiation -----
  const contentType = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const rawBody = await request.text();
  const hasContent = rawBody.trim().length > 0;

  // RFC 10008 section 2: "Servers MUST fail the request if the Content-Type
  // request field is missing or is inconsistent with the request content."
  // A missing media type is a 400 rather than a 415 - there is nothing to
  // negotiate, the client simply did not say what it sent.
  if (hasContent && !contentType) {
    return jsonResponse(
      errorResponse(
        'MISSING_CONTENT_TYPE',
        `A QUERY request that carries content must declare its media type. Set Content-Type to one of: ${ACCEPTED_CONTENT_TYPES.join(', ')}`,
        requestId
      ),
      400,
      { 'X-Request-Id': requestId, 'Accept-Query': ACCEPT_QUERY }
    );
  }

  if (hasContent && !ACCEPTED_CONTENT_TYPES.includes(contentType)) {
    return jsonResponse(
      errorResponse(
        'UNSUPPORTED_MEDIA_TYPE',
        `Content-Type '${contentType}' is not supported. Use one of: ${ACCEPTED_CONTENT_TYPES.join(', ')}`,
        requestId
      ),
      415,
      { 'X-Request-Id': requestId, 'Accept-Query': ACCEPT_QUERY }
    );
  }

  // ----- Parse body (an empty body is a valid "match everything" query) -----
  let input: QueryInput = {};
  if (rawBody.trim()) {
    try {
      const parsed = JSON.parse(rawBody);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        // Valid JSON, consistent with the declared media type, but not a query
        // this resource can process - RFC 10008 section 2 calls for 422 here.
        return jsonResponse(
          errorResponse(
            'UNPROCESSABLE_QUERY',
            'The QUERY body must be a JSON object with optional filter, sort, fields, page and limit members',
            requestId
          ),
          422,
          { 'X-Request-Id': requestId, 'Accept-Query': ACCEPT_QUERY }
        );
      }
      input = parsed as QueryInput;
    } catch {
      // The content contradicts the declared media type, which RFC 10008
      // section 2 treats as a 400 rather than a 422.
      return jsonResponse(
        errorResponse(
          'MALFORMED_JSON',
          `The request body is not valid JSON, but Content-Type declared '${contentType}'`,
          requestId
        ),
        400,
        { 'X-Request-Id': requestId, 'Accept-Query': ACCEPT_QUERY }
      );
    }
  }

  // ----- Compile to SQL -----
  const compiled = compileQuery(resource, input);

  if (compiled.issues.length > 0) {
    // Understood media type, well-formed JSON, but the query itself cannot be
    // processed - 422 Unprocessable Content per RFC 10008 section 2.
    return jsonResponse(
      errorResponse(
        'UNPROCESSABLE_QUERY',
        'The query could not be compiled. See details for the offending members.',
        requestId,
        compiled.issues
      ),
      422,
      { 'X-Request-Id': requestId, 'Accept-Query': ACCEPT_QUERY }
    );
  }

  try {
    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM ${resource.from} ${compiled.where}`
    )
      .bind(...compiled.params)
      .first<{ count: number }>();
    const total = countRow?.count || 0;

    const rows = await env.DB.prepare(
      `SELECT ${resource.select} FROM ${resource.from} ${compiled.where} ORDER BY ${compiled.orderBy} LIMIT ? OFFSET ?`
    )
      .bind(...compiled.params, compiled.limit, compiled.offset)
      .all();

    const data = (rows.results || [])
      .map((row) => resource.format(row))
      .map((item) => projectFields(item as Record<string, unknown>, compiled.fields));

    const lastItem = data[data.length - 1] as { id?: string } | undefined;
    const pagination = calculatePagination(compiled.page, compiled.limit, total, {
      includeCursors: true,
      lastItemId: lastItem?.id,
    });

    const envelope: any = paginatedResponse(data, pagination, {
      requestId,
      version: env.API_VERSION,
    });

    // Echo the normalised query so clients can assert on how it was interpreted.
    envelope.meta.query = compiled.normalized;
    envelope.meta.querySource = source;

    const body = JSON.stringify(envelope);
    const etag = await computeEtag(body, true);

    // QUERY is safe and idempotent, so conditional requests apply as they do to GET.
    if (etagMatches(request.headers.get('If-None-Match'), etag)) {
      return notModified(etag, {
        'X-Request-Id': requestId,
        'X-Query-Source': source,
        'Accept-Query': ACCEPT_QUERY,
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
      'X-Query-Source': source,
      'X-Total-Count': String(total),
      ETag: etag,
      // RFC 10008 section 3: QUERY responses are cacheable, and the cache key
      // must incorporate the request content. Nothing in the chain here keys on
      // a request body, so revalidate every time and let the ETag do the work.
      'Cache-Control': 'private, max-age=0, must-revalidate',
      Vary: 'Accept, Authorization, X-API-Key',
      Allow: 'GET, POST, QUERY, HEAD, OPTIONS',
      'Accept-Query': ACCEPT_QUERY,
    };

    const link = buildLinkHeader(new URL(request.url), pagination);
    if (link) headers.Link = link;

    return new Response(body, { status: 200, headers });
  } catch (error) {
    console.error(`Error running QUERY on ${resourceName}:`, error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', `Failed to execute query on ${resourceName}`, requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
}

/**
 * Discovery document describing the query DSL.
 * Served from GET /v1/query-schema and GET /v1/{resource}/query-schema.
 */
export function querySchemaFor(resourceName?: string) {
  const describe = (name: string) => {
    const resource = QUERYABLE_RESOURCES[name];
    return {
      resource: name,
      endpoints: {
        native: `QUERY /v1/${name}`,
        pathFallback: `POST /v1/${name}/query`,
        headerOverride: `POST /v1/${name} with X-HTTP-Method-Override: QUERY`,
      },
      queryableFields: Object.fromEntries(
        Object.entries(resource.fields).map(([field, def]) => [field, def.type])
      ),
      defaultSort: resource.defaultSort,
    };
  };

  return {
    method: 'QUERY',
    description:
      'QUERY is a safe, idempotent method that carries a request body. Send a JSON object with optional filter, sort, fields, page and limit members.',
    specification: 'RFC 10008 - The HTTP QUERY Method (Proposed Standard, June 2026)',
    contentTypes: ACCEPTED_CONTENT_TYPES,
    acceptQueryHeader: ACCEPT_QUERY,
    statusCodes: {
      '200': 'Query executed. Carries ETag, Link, X-Total-Count and Accept-Query.',
      '304': 'If-None-Match matched the result set. QUERY is safe, so conditional requests apply as they do to GET.',
      '400': 'Content-Type missing, or the body contradicts the declared media type (for example invalid JSON).',
      '415': 'Content-Type is present but not a media type this resource accepts.',
      '422': 'Media type understood and the body is well-formed, but the query cannot be processed - an unknown field, operator or malformed member.',
      '405': 'This resource does not support QUERY.',
    },
    operators: {
      eq: 'Equal to. Also the shorthand when a bare value is given.',
      ne: 'Not equal to.',
      gt: 'Greater than.',
      gte: 'Greater than or equal to.',
      lt: 'Less than.',
      lte: 'Less than or equal to.',
      in: 'Value is in the given array.',
      nin: 'Value is not in the given array.',
      contains: 'Substring match (string fields).',
      startsWith: 'Prefix match (string fields).',
      endsWith: 'Suffix match (string fields).',
      between: 'Inclusive range, given as a two-element array.',
      isNull: 'true matches NULL, false matches NOT NULL.',
    },
    logicalOperators: {
      and: 'Array of filter objects, all of which must match.',
      or: 'Array of filter objects, at least one of which must match.',
      not: 'A filter object that must not match.',
    },
    example: {
      filter: {
        status: { in: ['pending', 'overdue'] },
        amount: { gte: 100, lte: 5000 },
        or: [{ billerCategory: 'telecom' }, { billerCategory: 'electricity' }],
      },
      sort: ['-amount', 'dueDate'],
      fields: ['id', 'amount', 'status', 'dueDate'],
      page: 1,
      limit: 20,
    },
    resources: resourceName
      ? [describe(resourceName)]
      : QUERYABLE_RESOURCE_NAMES.map((name) => describe(name)),
  };
}
