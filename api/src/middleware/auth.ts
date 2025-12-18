// Authentication Middleware
// Supports: API Key (header/query), Bearer Token, Basic Auth, OAuth2

import { Env, AuthContext, RequestContext } from '../types';
import { errorResponse, jsonResponse, generateId } from '../utils';

export interface AuthResult {
  success: boolean;
  context?: AuthContext;
  error?: { code: string; message: string };
}

/**
 * Authenticate request using multiple methods
 * Order of precedence: Bearer Token > API Key Header > API Key Query > Basic Auth
 */
export function authenticateRequest(request: Request, env: Env): AuthResult {
  const authHeader = request.headers.get('Authorization');
  const apiKeyHeader = request.headers.get('X-API-Key');
  const url = new URL(request.url);
  const apiKeyQuery = url.searchParams.get('api_key');

  // 1. Check Bearer Token (JWT)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return validateBearerToken(token, env);
  }

  // 2. Check Basic Auth
  if (authHeader?.startsWith('Basic ')) {
    const credentials = authHeader.slice(6);
    return validateBasicAuth(credentials, env);
  }

  // 3. Check API Key (Header)
  if (apiKeyHeader) {
    return validateApiKey(apiKeyHeader, env, 'header');
  }

  // 4. Check API Key (Query Parameter)
  if (apiKeyQuery) {
    return validateApiKey(apiKeyQuery, env, 'query');
  }

  // No authentication provided
  return {
    success: false,
    error: {
      code: 'MISSING_AUTHENTICATION',
      message: 'Authentication required. Provide API Key, Bearer token, or Basic auth credentials.',
    },
  };
}

/**
 * Validate Bearer Token (simplified JWT validation for demo)
 */
function validateBearerToken(token: string, env: Env): AuthResult {
  // For demo purposes, accept the demo token
  if (token === env.DEMO_JWT_TOKEN) {
    return {
      success: true,
      context: {
        type: 'bearer',
        identifier: 'demo-user',
        scopes: ['read:all', 'write:all'],
      },
    };
  }

  // Check if token looks like a JWT (three base64 parts)
  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      // Decode payload (middle part) - simplified, no signature verification for demo
      const payload = JSON.parse(atob(parts[1]));
      
      // Check expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return {
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'The provided token has expired.',
          },
        };
      }

      return {
        success: true,
        context: {
          type: 'bearer',
          identifier: payload.sub || payload.user_id || 'unknown',
          scopes: payload.scopes || payload.scope?.split(' ') || [],
        },
      };
    } catch {
      // Invalid JWT format
    }
  }

  return {
    success: false,
    error: {
      code: 'INVALID_TOKEN',
      message: 'The provided Bearer token is invalid or malformed.',
    },
  };
}

/**
 * Validate Basic Auth credentials
 */
function validateBasicAuth(credentials: string, env: Env): AuthResult {
  try {
    const decoded = atob(credentials);
    const [username, password] = decoded.split(':');

    // Check against demo credentials
    if (username === env.DEMO_BASIC_USER && password === env.DEMO_BASIC_PASS) {
      return {
        success: true,
        context: {
          type: 'basic',
          identifier: username,
          scopes: ['read:all', 'write:all'],
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password.',
      },
    };
  } catch {
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Malformed Basic auth credentials.',
      },
    };
  }
}

/**
 * Validate API Key
 */
function validateApiKey(apiKey: string, env: Env, source: 'header' | 'query'): AuthResult {
  // Check against demo API key
  if (apiKey === env.DEMO_API_KEY) {
    return {
      success: true,
      context: {
        type: 'api_key',
        identifier: `api_key_${source}`,
        scopes: ['read:all', 'write:all'],
      },
    };
  }

  // Check for valid API key format (for custom keys)
  if (/^[a-zA-Z0-9_-]{16,64}$/.test(apiKey)) {
    // In a real implementation, you'd validate against a database
    // For demo, accept any well-formatted key
    return {
      success: true,
      context: {
        type: 'api_key',
        identifier: apiKey.slice(0, 8) + '...',
        scopes: ['read:all', 'write:all'],
      },
    };
  }

  return {
    success: false,
    error: {
      code: 'INVALID_API_KEY',
      message: 'The provided API key is invalid.',
    },
  };
}

/**
 * OAuth2 Token endpoint handler (simplified for demo)
 */
export async function handleOAuthToken(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse(
      errorResponse('METHOD_NOT_ALLOWED', 'Use POST for token requests', generateId()),
      405
    );
  }

  const contentType = request.headers.get('Content-Type');
  let grantType: string | null = null;
  let clientId: string | null = null;
  let clientSecret: string | null = null;
  let code: string | null = null;
  let refreshToken: string | null = null;

  if (contentType?.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    grantType = formData.get('grant_type') as string;
    clientId = formData.get('client_id') as string;
    clientSecret = formData.get('client_secret') as string;
    code = formData.get('code') as string;
    refreshToken = formData.get('refresh_token') as string;
  } else if (contentType?.includes('application/json')) {
    const body = await request.json() as Record<string, string>;
    grantType = body.grant_type;
    clientId = body.client_id;
    clientSecret = body.client_secret;
    code = body.code;
    refreshToken = body.refresh_token;
  }

  // Validate client credentials
  if (clientId !== env.DEMO_OAUTH_CLIENT_ID || clientSecret !== env.DEMO_OAUTH_CLIENT_SECRET) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'invalid_client',
          message: 'Invalid client credentials',
          traceId: generateId(),
          timestamp: new Date().toISOString(),
        },
      },
      401
    );
  }

  // Generate demo tokens based on grant type
  const accessToken = `access_${generateId().replace(/-/g, '')}`;
  const newRefreshToken = `refresh_${generateId().replace(/-/g, '')}`;

  switch (grantType) {
    case 'authorization_code':
      if (!code) {
        return jsonResponse(
          errorResponse('invalid_request', 'Missing authorization code', generateId()),
          400
        );
      }
      break;

    case 'client_credentials':
      // No additional validation needed
      break;

    case 'refresh_token':
      if (!refreshToken) {
        return jsonResponse(
          errorResponse('invalid_request', 'Missing refresh token', generateId()),
          400
        );
      }
      break;

    default:
      return jsonResponse(
        errorResponse('unsupported_grant_type', `Grant type '${grantType}' is not supported`, generateId()),
        400
      );
  }

  // Return OAuth2 token response
  return new Response(
    JSON.stringify({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: newRefreshToken,
      scope: 'read:all write:all',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
      },
    }
  );
}

/**
 * Check if request requires authentication
 * Some endpoints may be public (e.g., health check, billers list)
 */
export function isPublicEndpoint(path: string, method: string): boolean {
  const publicEndpoints = [
    { path: '/health', methods: ['GET'] },
    { path: '/version', methods: ['GET'] },
    { path: /^\/v1\/billers/, methods: ['GET', 'HEAD', 'OPTIONS'] },
    { path: '/v1/oauth/token', methods: ['POST'] },
    { path: '/v1/oauth/authorize', methods: ['GET'] },
  ];

  for (const endpoint of publicEndpoints) {
    if (typeof endpoint.path === 'string') {
      if (path === endpoint.path && endpoint.methods.includes(method)) {
        return true;
      }
    } else if (endpoint.path instanceof RegExp) {
      if (endpoint.path.test(path) && endpoint.methods.includes(method)) {
        return true;
      }
    }
  }

  return false;
}
