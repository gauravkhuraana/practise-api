// Auth Routes - OAuth2 Demo Endpoints

import { Router, IRequest } from 'itty-router';
import { Env, RequestContext } from '../types';
import { jsonResponse, errorResponse, generateId, getCurrentTimestamp } from '../utils';

export const authRouter = Router({ base: '' });

// POST /oauth/token or /v1/auth/token - OAuth2 Token Endpoint
const tokenHandler = async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || request.headers.get('X-Request-Id') || generateId();
  
  try {
    const contentType = request.headers.get('Content-Type') || '';
    let body: Record<string, string> = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      for (const [key, value] of params) {
        body[key] = value;
      }
    } else if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      return jsonResponse(
        errorResponse(
          'INVALID_CONTENT_TYPE',
          'Content-Type must be application/x-www-form-urlencoded or application/json',
          requestId
        ),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    const grantType = body.grant_type;

    // Client Credentials Grant
    if (grantType === 'client_credentials') {
      const clientId = body.client_id;
      const clientSecret = body.client_secret;

      if (clientId === env.DEMO_OAUTH_CLIENT_ID && clientSecret === env.DEMO_OAUTH_CLIENT_SECRET) {
        return jsonResponse({
          access_token: env.DEMO_JWT_TOKEN,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'read:all write:all',
          created_at: Math.floor(Date.now() / 1000),
        }, 200, { 'X-Request-Id': requestId });
      }

      return jsonResponse(
        errorResponse('INVALID_CLIENT', 'Invalid client credentials', requestId),
        401,
        { 'X-Request-Id': requestId }
      );
    }

    // Password Grant (Resource Owner)
    if (grantType === 'password') {
      const username = body.username;
      const password = body.password;

      if (username === env.DEMO_BASIC_USER && password === env.DEMO_BASIC_PASS) {
        return jsonResponse({
          access_token: env.DEMO_JWT_TOKEN,
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'demo-refresh-token-789',
          scope: 'read:all write:all',
          created_at: Math.floor(Date.now() / 1000),
        }, 200, { 'X-Request-Id': requestId });
      }

      return jsonResponse(
        errorResponse('INVALID_GRANT', 'Invalid username or password', requestId),
        401,
        { 'X-Request-Id': requestId }
      );
    }

    // Refresh Token Grant
    if (grantType === 'refresh_token') {
      const refreshToken = body.refresh_token;

      if (refreshToken === 'demo-refresh-token-789') {
        return jsonResponse({
          access_token: env.DEMO_JWT_TOKEN,
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'demo-refresh-token-789',
          scope: 'read:all write:all',
          created_at: Math.floor(Date.now() / 1000),
        }, 200, { 'X-Request-Id': requestId });
      }

      return jsonResponse(
        errorResponse('INVALID_GRANT', 'Invalid refresh token', requestId),
        401,
        { 'X-Request-Id': requestId }
      );
    }

    return jsonResponse(
      errorResponse(
        'UNSUPPORTED_GRANT_TYPE',
        `Unsupported grant_type: ${grantType}. Supported: client_credentials, password, refresh_token`,
        requestId
      ),
      400,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Invalid request body', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }
};

authRouter.post('/oauth/token', tokenHandler);
authRouter.post('/v1/auth/token', tokenHandler);

// GET /v1/auth/me - Get current user info (requires auth)
authRouter.get('/v1/auth/me', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || request.headers.get('X-Request-Id') || generateId();
  
  return jsonResponse({
    success: true,
    data: {
      user: {
        id: 'demo-user',
        email: 'demo@example.com',
        name: 'Demo User',
        scopes: ctx?.auth?.scopes || ['read:all', 'write:all'],
      },
      authMethod: ctx?.auth?.type || 'api_key',
    },
    meta: {
      requestId,
      timestamp: getCurrentTimestamp(),
      version: env.API_VERSION || 'v1',
    },
  }, 200, { 'X-Request-Id': requestId });
});

// POST /v1/auth/validate - Validate token/credentials
authRouter.post('/v1/auth/validate', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || request.headers.get('X-Request-Id') || generateId();
  
  return jsonResponse({
    success: true,
    data: {
      valid: true,
      authMethod: ctx?.auth?.type || 'api_key',
      identifier: ctx?.auth?.identifier,
      scopes: ctx?.auth?.scopes || [],
    },
    meta: {
      requestId,
      timestamp: getCurrentTimestamp(),
      version: env.API_VERSION || 'v1',
    },
  }, 200, { 'X-Request-Id': requestId });
});
