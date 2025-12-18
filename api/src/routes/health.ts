// Health Check Routes

import { Router, IRequest } from 'itty-router';
import { Env, RequestContext } from '../types';
import { jsonResponse, generateId, getCurrentTimestamp, successResponse } from '../utils';

export const healthRouter = Router({ base: '' });

// GET /health - Basic health check
healthRouter.get('/health', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || request.headers.get('X-Request-Id') || generateId();
  
  return jsonResponse({
    success: true,
    data: {
      status: 'healthy',
      service: 'billpay-api',
      version: env.API_VERSION || 'v1',
      timestamp: getCurrentTimestamp(),
    },
    meta: {
      requestId,
      timestamp: getCurrentTimestamp(),
      version: env.API_VERSION || 'v1',
    },
  }, 200, { 'X-Request-Id': requestId });
});

// GET /v1/health - API v1 health check
healthRouter.get('/v1/health', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || request.headers.get('X-Request-Id') || generateId();
  
  return jsonResponse({
    success: true,
    data: {
      status: 'healthy',
      service: 'billpay-api',
      version: env.API_VERSION || 'v1',
      timestamp: getCurrentTimestamp(),
    },
    meta: {
      requestId,
      timestamp: getCurrentTimestamp(),
      version: env.API_VERSION || 'v1',
    },
  }, 200, { 'X-Request-Id': requestId });
});

// GET /health/db - Database health check
healthRouter.get('/health/db', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || request.headers.get('X-Request-Id') || generateId();
  
  try {
    // Test database connection
    const result = await env.DB.prepare('SELECT COUNT(*) as count FROM billers').first<{ count: number }>();
    
    return jsonResponse({
      success: true,
      data: {
        status: 'healthy',
        database: 'connected',
        billerCount: result?.count || 0,
        timestamp: getCurrentTimestamp(),
      },
      meta: {
        requestId,
        timestamp: getCurrentTimestamp(),
        version: env.API_VERSION || 'v1',
      },
    }, 200, { 'X-Request-Id': requestId });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database connection failed',
        traceId: requestId,
        timestamp: getCurrentTimestamp(),
      },
      meta: {
        requestId,
        timestamp: getCurrentTimestamp(),
        version: env.API_VERSION || 'v1',
      },
    }, 503, { 'X-Request-Id': requestId });
  }
});

// GET /v1/health/db
healthRouter.get('/v1/health/db', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || request.headers.get('X-Request-Id') || generateId();
  
  try {
    const result = await env.DB.prepare('SELECT COUNT(*) as count FROM billers').first<{ count: number }>();
    
    return jsonResponse({
      success: true,
      data: {
        status: 'healthy',
        database: 'connected',
        billerCount: result?.count || 0,
        timestamp: getCurrentTimestamp(),
      },
      meta: {
        requestId,
        timestamp: getCurrentTimestamp(),
        version: env.API_VERSION || 'v1',
      },
    }, 200, { 'X-Request-Id': requestId });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database connection failed',
        traceId: requestId,
        timestamp: getCurrentTimestamp(),
      },
    }, 503, { 'X-Request-Id': requestId });
  }
});
