// Rate Limiting Middleware
// Implements sliding window rate limiting using D1

import { Env } from '../types';
import { errorResponse, jsonResponse, generateId, getCurrentTimestamp } from '../utils';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds
}

/**
 * Check rate limit for a request
 * Uses client IP as the rate limit key
 */
export async function checkRateLimit(
  clientIp: string,
  env: Env
): Promise<RateLimitResult> {
  const maxRequests = parseInt(env.RATE_LIMIT_MAX || '100', 10);
  const windowSeconds = parseInt(env.RATE_LIMIT_WINDOW_SECONDS || '60', 10);
  const now = Date.now();
  const windowStart = new Date(now - windowSeconds * 1000).toISOString();
  const resetTime = Math.floor((now + windowSeconds * 1000) / 1000);

  try {
    // Get current rate limit record
    const result = await env.DB.prepare(`
      SELECT request_count, window_start 
      FROM rate_limits 
      WHERE key = ?
    `).bind(clientIp).first<{ request_count: number; window_start: string }>();

    if (!result) {
      // First request from this IP
      await env.DB.prepare(`
        INSERT INTO rate_limits (key, request_count, window_start)
        VALUES (?, 1, ?)
      `).bind(clientIp, getCurrentTimestamp()).run();

      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: resetTime,
      };
    }

    // Check if window has expired
    const recordWindowStart = new Date(result.window_start).getTime();
    const windowExpired = now - recordWindowStart > windowSeconds * 1000;

    if (windowExpired) {
      // Reset the window
      await env.DB.prepare(`
        UPDATE rate_limits 
        SET request_count = 1, window_start = ?
        WHERE key = ?
      `).bind(getCurrentTimestamp(), clientIp).run();

      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: resetTime,
      };
    }

    // Check if limit exceeded
    if (result.request_count >= maxRequests) {
      const retryAfter = Math.ceil((recordWindowStart + windowSeconds * 1000 - now) / 1000);
      return {
        allowed: false,
        limit: maxRequests,
        remaining: 0,
        reset: Math.floor((recordWindowStart + windowSeconds * 1000) / 1000),
        retryAfter,
      };
    }

    // Increment counter
    await env.DB.prepare(`
      UPDATE rate_limits 
      SET request_count = request_count + 1
      WHERE key = ?
    `).bind(clientIp).run();

    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - result.request_count - 1,
      reset: resetTime,
    };
  } catch (error) {
    // If rate limiting fails, allow the request (fail open)
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests,
      reset: resetTime,
    };
  }
}

/**
 * Get rate limit headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };

  if (result.retryAfter !== undefined) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Create rate limit exceeded response
 */
export function rateLimitExceededResponse(result: RateLimitResult, requestId: string): Response {
  return jsonResponse(
    errorResponse(
      'RATE_LIMIT_EXCEEDED',
      `Too many requests. Please retry after ${result.retryAfter} seconds.`,
      requestId,
      [
        {
          field: 'rate_limit',
          code: 'EXCEEDED',
          message: `You have exceeded the rate limit of ${result.limit} requests per minute.`,
        },
      ]
    ),
    429,
    getRateLimitHeaders(result)
  );
}

/**
 * Clean up old rate limit records (for scheduled cleanup)
 */
export async function cleanupRateLimits(env: Env): Promise<number> {
  const windowSeconds = parseInt(env.RATE_LIMIT_WINDOW_SECONDS || '60', 10);
  const cutoff = new Date(Date.now() - windowSeconds * 2 * 1000).toISOString();

  const result = await env.DB.prepare(`
    DELETE FROM rate_limits 
    WHERE window_start < ?
  `).bind(cutoff).run();

  return result.meta.changes || 0;
}
