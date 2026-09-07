// RFC 6902 JSON Patch, plus the glue that lets the existing merge-style PATCH
// handlers accept a patch document.
//
// A PATCH sent as `application/json-patch+json` is applied against the current
// representation of the resource; the resulting document is then handed to the
// normal handler as an ordinary partial update, so every route gets JSON Patch
// support without duplicating update logic.

import { Env, RequestContext } from '../types';
import { errorResponse, jsonResponse, successResponse, generateId } from '../utils';
import { QUERYABLE_RESOURCES } from './resources';

export const JSON_PATCH_CONTENT_TYPE = 'application/json-patch+json';

export interface PatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  from?: string;
  value?: unknown;
}

export interface PatchFailure {
  code: 'INVALID_PATCH' | 'PATCH_PATH_NOT_FOUND' | 'PATCH_TEST_FAILED';
  message: string;
  index: number;
}

export type PatchResult =
  | { ok: true; document: Record<string, unknown> }
  | { ok: false; error: PatchFailure };

// ============================================
// JSON Pointer (RFC 6901)
// ============================================

function decodeToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

function parsePointer(pointer: string): string[] | null {
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) return null;
  return pointer.slice(1).split('/').map(decodeToken);
}

function getParent(
  doc: unknown,
  tokens: string[]
): { parent: any; key: string } | null {
  let current: any = doc;
  for (let i = 0; i < tokens.length - 1; i++) {
    if (current === null || typeof current !== 'object') return null;
    const token = Array.isArray(current) ? Number(tokens[i]) : tokens[i];
    current = current[token as any];
  }
  if (current === null || typeof current !== 'object') return null;
  return { parent: current, key: tokens[tokens.length - 1] };
}

function getValue(doc: unknown, tokens: string[]): { found: boolean; value?: unknown } {
  let current: any = doc;
  for (const token of tokens) {
    if (current === null || typeof current !== 'object') return { found: false };
    const key = Array.isArray(current) ? Number(token) : token;
    if (!(key in current)) return { found: false };
    current = current[key as any];
  }
  return { found: true, value: current };
}

function setValue(doc: any, tokens: string[], value: unknown, isAdd: boolean): boolean {
  if (tokens.length === 0) return false;

  const target = getParent(doc, tokens);
  if (!target) return false;

  const { parent, key } = target;

  if (Array.isArray(parent)) {
    if (key === '-') {
      if (!isAdd) return false;
      parent.push(value);
      return true;
    }
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index > parent.length) return false;
    if (isAdd) parent.splice(index, 0, value);
    else {
      if (index >= parent.length) return false;
      parent[index] = value;
    }
    return true;
  }

  if (!isAdd && !(key in parent)) return false;
  parent[key] = value;
  return true;
}

function removeValue(doc: any, tokens: string[]): boolean {
  if (tokens.length === 0) return false;

  const target = getParent(doc, tokens);
  if (!target) return false;

  const { parent, key } = target;

  if (Array.isArray(parent)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= parent.length) return false;
    parent.splice(index, 1);
    return true;
  }

  if (!(key in parent)) return false;
  delete parent[key];
  return true;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

// ============================================
// Patch application
// ============================================

export function applyJsonPatch(
  document: Record<string, unknown>,
  operations: unknown
): PatchResult {
  if (!Array.isArray(operations)) {
    return {
      ok: false,
      error: { code: 'INVALID_PATCH', message: 'A JSON Patch body must be an array of operations', index: -1 },
    };
  }

  // Work on a copy so a failed operation leaves the original untouched.
  const doc = JSON.parse(JSON.stringify(document)) as Record<string, unknown>;

  for (let i = 0; i < operations.length; i++) {
    const raw = operations[i];

    if (typeof raw !== 'object' || raw === null) {
      return { ok: false, error: { code: 'INVALID_PATCH', message: 'Each operation must be an object', index: i } };
    }

    const operation = raw as PatchOperation;
    const tokens = parsePointer(operation.path ?? '');

    if (tokens === null) {
      return {
        ok: false,
        error: { code: 'INVALID_PATCH', message: `Invalid JSON Pointer '${operation.path}'`, index: i },
      };
    }

    switch (operation.op) {
      case 'add': {
        if (!setValue(doc, tokens, operation.value, true)) {
          return {
            ok: false,
            error: { code: 'PATCH_PATH_NOT_FOUND', message: `Cannot add at '${operation.path}'`, index: i },
          };
        }
        break;
      }

      case 'replace': {
        if (!getValue(doc, tokens).found || !setValue(doc, tokens, operation.value, false)) {
          return {
            ok: false,
            error: {
              code: 'PATCH_PATH_NOT_FOUND',
              message: `Cannot replace '${operation.path}' because it does not exist`,
              index: i,
            },
          };
        }
        break;
      }

      case 'remove': {
        if (!removeValue(doc, tokens)) {
          return {
            ok: false,
            error: {
              code: 'PATCH_PATH_NOT_FOUND',
              message: `Cannot remove '${operation.path}' because it does not exist`,
              index: i,
            },
          };
        }
        break;
      }

      case 'move':
      case 'copy': {
        const fromTokens = parsePointer(operation.from ?? '');
        if (fromTokens === null) {
          return {
            ok: false,
            error: { code: 'INVALID_PATCH', message: `Operation '${operation.op}' requires a valid 'from' pointer`, index: i },
          };
        }
        const source = getValue(doc, fromTokens);
        if (!source.found) {
          return {
            ok: false,
            error: { code: 'PATCH_PATH_NOT_FOUND', message: `Source '${operation.from}' does not exist`, index: i },
          };
        }
        const copied = JSON.parse(JSON.stringify(source.value ?? null));
        if (operation.op === 'move') removeValue(doc, fromTokens);
        if (!setValue(doc, tokens, copied, true)) {
          return {
            ok: false,
            error: { code: 'PATCH_PATH_NOT_FOUND', message: `Cannot write to '${operation.path}'`, index: i },
          };
        }
        break;
      }

      case 'test': {
        const actual = getValue(doc, tokens);
        if (!actual.found || !deepEqual(actual.value, operation.value)) {
          return {
            ok: false,
            error: {
              code: 'PATCH_TEST_FAILED',
              message: `Test failed at '${operation.path}': expected ${JSON.stringify(operation.value)}, found ${JSON.stringify(actual.value)}`,
              index: i,
            },
          };
        }
        break;
      }

      default:
        return {
          ok: false,
          error: {
            code: 'INVALID_PATCH',
            message: `Unsupported operation '${(operation as any).op}'. Supported: add, remove, replace, move, copy, test`,
            index: i,
          },
        };
    }
  }

  return { ok: true, document: doc };
}

// ============================================
// Request rewriting
// ============================================

const PATCHABLE_TABLES: Record<string, string> = {
  billers: 'billers',
  bills: 'bills',
  payments: 'payments',
  users: 'users',
};

/**
 * If this is a JSON Patch request, apply the patch to the current resource and
 * return a rewritten Request carrying an ordinary merge body.
 * Returns `{ response }` when the patch itself is invalid.
 */
export async function rewriteJsonPatchRequest(
  env: Env,
  request: Request,
  url: URL,
  ctx: RequestContext
): Promise<{ request?: Request; response?: Response }> {
  const requestId = ctx.requestId || generateId();
  const match = url.pathname.match(/^\/v1\/([a-z-]+)\/([^/]+)\/?$/);
  if (!match) {
    return {
      response: jsonResponse(
        errorResponse(
          'INVALID_REQUEST',
          'JSON Patch is only supported on a single resource, for example PATCH /v1/bills/{id}',
          requestId
        ),
        400,
        { 'X-Request-Id': requestId }
      ),
    };
  }

  const resourceName = match[1];
  const id = decodeURIComponent(match[2]);
  const table = PATCHABLE_TABLES[resourceName];
  const resource = QUERYABLE_RESOURCES[resourceName];

  if (!table || !resource) {
    return {
      response: jsonResponse(
        errorResponse(
          'UNSUPPORTED_MEDIA_TYPE',
          `JSON Patch is not supported for '${resourceName}'. Supported: ${Object.keys(PATCHABLE_TABLES).join(', ')}`,
          requestId
        ),
        415,
        { 'X-Request-Id': requestId, 'Accept-Patch': 'application/json, application/json-patch+json' }
      ),
    };
  }

  let operations: unknown;
  try {
    operations = JSON.parse(await request.text());
  } catch {
    return {
      response: jsonResponse(
        errorResponse('MALFORMED_JSON', 'The JSON Patch body is not valid JSON', requestId),
        400,
        { 'X-Request-Id': requestId }
      ),
    };
  }

  let row: any;
  try {
    row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
  } catch (error) {
    console.error('JSON Patch lookup failed:', error);
    row = null;
  }

  if (!row) {
    return {
      response: jsonResponse(
        errorResponse('NOT_FOUND', `Resource '${id}' not found in ${resourceName}`, requestId),
        404,
        { 'X-Request-Id': requestId }
      ),
    };
  }

  const current = resource.format(row) as Record<string, unknown>;
  const result = applyJsonPatch(current, operations);

  if (!result.ok) {
    // A failed `test` op is a conflict; everything else is a malformed patch.
    const status = result.error.code === 'PATCH_TEST_FAILED' ? 409 : 400;
    return {
      response: jsonResponse(
        errorResponse(result.error.code, result.error.message, requestId, [
          {
            field: `operations[${result.error.index}]`,
            code: result.error.code,
            message: result.error.message,
          },
        ]),
        status,
        { 'X-Request-Id': requestId }
      ),
    };
  }

  // Only send fields the patch actually changed, so existing validation
  // for partial updates continues to apply.
  const merge: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(result.document)) {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
    if (JSON.stringify(value) !== JSON.stringify(current[key])) merge[key] = value;
  }

  // A patch that changes nothing is still a successful patch - most often it is
  // a retry of one that already applied. Returning the current representation
  // keeps the operation idempotent, rather than failing on "no fields to update".
  if (Object.keys(merge).length === 0) {
    return {
      response: jsonResponse(
        successResponse(current, { requestId, version: env.API_VERSION }),
        200,
        {
          'X-Request-Id': requestId,
          'X-Patch-Format': 'json-patch',
          'X-Patch-Result': 'no-change',
        }
      ),
    };
  }

  const headers = new Headers(request.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Patch-Format', 'json-patch');

  return {
    request: new Request(request.url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(merge),
    }),
  };
}
