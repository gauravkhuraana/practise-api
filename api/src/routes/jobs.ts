// Async jobs - the 202 Accepted + polling pattern.
//
// A job is created immediately and returns 202 with a Location header and a
// Retry-After hint. The job then advances through queued -> processing ->
// completed (or failed) based on elapsed wall-clock time, so polling behaves
// realistically without needing a background worker.

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

export const jobsRouter = Router({ base: '/v1/jobs' });

export const JOB_TYPES = [
  'statement-export',
  'bulk-payment',
  'reconciliation',
  'bill-import',
] as const;

type JobType = (typeof JOB_TYPES)[number];
type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

const DEFAULT_DURATION_MS = 4000;
const MIN_DURATION_MS = 500;
const MAX_DURATION_MS = 120000;

// ============================================
// POST /v1/jobs - Start an async job (202 Accepted)
// ============================================
jobsRouter.post('/', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();

  let body: any = {};
  try {
    const raw = await request.text();
    if (raw.trim()) body = JSON.parse(raw);
  } catch {
    return jsonResponse(
      errorResponse('MALFORMED_JSON', 'The request body is not valid JSON', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  const type: JobType = body.type || 'statement-export';
  if (!(JOB_TYPES as readonly string[]).includes(type)) {
    return jsonResponse(
      errorResponse('VALIDATION_ERROR', 'Invalid job type', requestId, [
        {
          field: 'type',
          code: 'INVALID_VALUE',
          message: `type must be one of: ${JOB_TYPES.join(', ')}`,
        },
      ]),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  const requestedDuration = Number(body.durationMs ?? DEFAULT_DURATION_MS);
  const durationMs = Number.isFinite(requestedDuration)
    ? Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, Math.trunc(requestedDuration)))
    : DEFAULT_DURATION_MS;

  const shouldFail = body.shouldFail === true || body.shouldFail === 'true' ? 1 : 0;

  const id = `job-${generateId().slice(0, 12)}`;
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  // The job spends the first quarter of its life queued, then processes.
  const processingAt = new Date(now + Math.floor(durationMs / 4)).toISOString();
  const readyAt = new Date(now + durationMs).toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO jobs (id, type, status, progress, request_body, should_fail,
                         created_at, updated_at, processing_at, ready_at, created_by)
       VALUES (?, ?, 'queued', 0, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        type,
        JSON.stringify(body.payload ?? {}),
        shouldFail,
        nowIso,
        nowIso,
        processingAt,
        readyAt,
        ctx?.auth?.identifier || 'user'
      )
      .run();

    const retryAfter = Math.max(1, Math.ceil(durationMs / 2000));

    return jsonResponse(
      successResponse(
        {
          id,
          type,
          status: 'queued',
          progress: 0,
          statusUrl: `/v1/jobs/${id}`,
          estimatedDurationMs: durationMs,
          createdAt: nowIso,
        },
        { requestId, version: env.API_VERSION }
      ),
      202,
      {
        'X-Request-Id': requestId,
        Location: `/v1/jobs/${id}`,
        'Retry-After': String(retryAfter),
        'X-Job-Id': id,
      }
    );
  } catch (error) {
    console.error('Error creating job:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to create job', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/jobs - List jobs
// ============================================
jobsRouter.get('/', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);
  const { page, limit, offset, mode } = parsePaginationParams(url);
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');

  try {
    let whereClause = 'WHERE 1=1';
    const params: unknown[] = [];

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    const countRow = await env.DB.prepare(`SELECT COUNT(*) as count FROM jobs ${whereClause}`)
      .bind(...params)
      .first<{ count: number }>();
    const total = countRow?.count || 0;

    const rows = await env.DB.prepare(
      `SELECT * FROM jobs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
      .bind(...params, limit, offset)
      .all();

    let data = (rows.results || []).map((row) => projectJob(row));
    // Status is derived at read time, so filter after projection.
    if (status) data = data.filter((job) => job.status === status);

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
    console.error('Error listing jobs:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to list jobs', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/jobs/:id - Poll job status
// ============================================
jobsRouter.get('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  try {
    const row = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first();

    if (!row) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Job with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const job = projectJob(row);

    // Persist the derived state so repeated polls agree with each other.
    if (job.status !== (row as any).status) {
      await env.DB.prepare(
        `UPDATE jobs SET status = ?, progress = ?, result_body = ?, error_code = ?,
                         error_message = ?, updated_at = ?, completed_at = ?
         WHERE id = ?`
      )
        .bind(
          job.status,
          job.progress,
          job.result ? JSON.stringify(job.result) : null,
          job.error?.code ?? null,
          job.error?.message ?? null,
          getCurrentTimestamp(),
          job.completedAt ?? null,
          id
        )
        .run();
    }

    const isTerminal = ['completed', 'failed', 'cancelled'].includes(job.status);
    const headers: Record<string, string> = {
      'X-Request-Id': requestId,
      'X-Job-Status': job.status,
      'Cache-Control': 'no-store',
    };

    if (!isTerminal) {
      headers['Retry-After'] = '2';
    } else if (job.status === 'completed') {
      headers.Location = `/v1/jobs/${id}`;
    }

    return jsonResponse(
      successResponse(job, { requestId, version: env.API_VERSION }),
      200,
      headers
    );
  } catch (error) {
    console.error('Error fetching job:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch job', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// DELETE /v1/jobs/:id - Cancel a job
// ============================================
jobsRouter.delete('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  try {
    const row = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first();

    if (!row) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Job with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const current = projectJob(row);
    if (['completed', 'failed'].includes(current.status)) {
      return jsonResponse(
        errorResponse(
          'CONFLICT',
          `Job '${id}' has already finished with status '${current.status}' and cannot be cancelled`,
          requestId
        ),
        409,
        { 'X-Request-Id': requestId }
      );
    }

    const now = getCurrentTimestamp();
    await env.DB.prepare(
      `UPDATE jobs SET status = 'cancelled', updated_at = ?, completed_at = ? WHERE id = ?`
    )
      .bind(now, now, id)
      .run();

    return jsonResponse(
      successResponse({ id, status: 'cancelled', cancelledAt: now }, { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error cancelling job:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to cancel job', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// Helpers
// ============================================

interface ProjectedJob {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  statusUrl: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  result?: unknown;
  error?: { code: string; message: string } | null;
}

/**
 * Derive the current job state from elapsed time.
 * Terminal states stored in the database always win.
 */
function projectJob(row: any): ProjectedJob {
  const stored: JobStatus = row.status;
  const base: ProjectedJob = {
    id: row.id,
    type: row.type,
    status: stored,
    progress: row.progress ?? 0,
    statusUrl: `/v1/jobs/${row.id}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? null,
    error: null,
  };

  if (stored === 'cancelled') return base;

  const now = Date.now();
  const createdAt = Date.parse(row.created_at);
  const processingAt = Date.parse(row.processing_at);
  const readyAt = Date.parse(row.ready_at);

  if (now < processingAt) {
    return { ...base, status: 'queued', progress: 0 };
  }

  if (now < readyAt) {
    const span = readyAt - processingAt;
    const elapsed = now - processingAt;
    const progress = span > 0 ? Math.min(99, Math.round((elapsed / span) * 100)) : 50;
    return { ...base, status: 'processing', progress };
  }

  const completedAt = row.completed_at || new Date(readyAt).toISOString();

  if (row.should_fail) {
    return {
      ...base,
      status: 'failed',
      progress: 100,
      completedAt,
      error: {
        code: 'JOB_FAILED',
        message: 'The job failed during processing. This job was created with shouldFail: true.',
      },
    };
  }

  return {
    ...base,
    status: 'completed',
    progress: 100,
    completedAt,
    result: buildResult(row.type, row.id, createdAt, readyAt),
  };
}

function buildResult(type: string, id: string, startedAt: number, finishedAt: number): unknown {
  const durationMs = Math.max(0, finishedAt - startedAt);

  switch (type) {
    case 'statement-export':
      return {
        format: 'csv',
        rowCount: 128,
        downloadUrl: `/v1/files/${id}-statement.csv`,
        durationMs,
      };
    case 'bulk-payment':
      return { submitted: 25, succeeded: 23, failed: 2, durationMs };
    case 'reconciliation':
      return { matched: 480, unmatched: 12, durationMs };
    case 'bill-import':
      return { imported: 42, skipped: 3, durationMs };
    default:
      return { durationMs };
  }
}
