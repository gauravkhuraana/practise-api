function buildAuthHeaders(auth) {
  const headers = {};

  if (!auth || !auth.type) return headers;

  if (auth.type === 'api_key') {
    if (auth.apiKeyLocation === 'header' && auth.apiKey) {
      headers['X-API-Key'] = auth.apiKey;
    }
  }

  if (auth.type === 'bearer') {
    if (auth.bearerToken) headers['Authorization'] = `Bearer ${auth.bearerToken}`;
  }

  if (auth.type === 'basic') {
    const u = auth.basic?.username ?? '';
    const p = auth.basic?.password ?? '';
    const token = btoa(`${u}:${p}`);
    headers['Authorization'] = `Basic ${token}`;
  }

  if (auth.type === 'cookie') {
    // Cookie auth - set via Cookie header (note: may be restricted by CORS in browser)
    if (auth.cookie?.sessionId) {
      headers['Cookie'] = `session_id=${auth.cookie.sessionId}`;
    }
  }

  return headers;
}

function applyQueryAuth(url, auth) {
  if (!auth || auth.type !== 'api_key') return url;
  if (auth.apiKeyLocation !== 'query') return url;
  if (!auth.apiKey) return url;
  const u = new URL(url);
  u.searchParams.set('api_key', auth.apiKey);
  return u.toString();
}

function extractMeta(headers) {
  const requestId = headers.get('X-Request-Id') || headers.get('x-request-id');
  const limit = headers.get('X-RateLimit-Limit');
  const remaining = headers.get('X-RateLimit-Remaining');
  const reset = headers.get('X-RateLimit-Reset');

  const meta = {};
  if (requestId) meta.requestId = requestId;
  if (limit || remaining || reset) {
    meta.rateLimit = {
      limit: limit ? Number(limit) : undefined,
      remaining: remaining ? Number(remaining) : undefined,
      reset: reset ?? undefined,
    };
  }
  return meta;
}

export function createApiClient({ baseUrl, auth, getAuth, onResponseMeta, getResponseFormat }) {
  const safeBase = (baseUrl || '').replace(/\/$/, '');

  const client = {
    __onResponseMeta: onResponseMeta,
    async request(method, path, options = {}) {
      const effectiveAuth = typeof getAuth === 'function' ? getAuth() : auth;
      const responseFormat = typeof getResponseFormat === 'function' ? getResponseFormat() : 'json';
      const url = applyQueryAuth(`${safeBase}${path}`, effectiveAuth);

      const acceptHeader = responseFormat === 'xml' ? 'application/xml' : 'application/json';

      const headers = {
        Accept: acceptHeader,
        ...buildAuthHeaders(effectiveAuth),
        ...(options.headers || {}),
      };

      // For cookie auth, we need credentials: 'include'
      const init = {
        method,
        headers,
        body: options.body,
        credentials: effectiveAuth?.type === 'cookie' ? 'include' : 'same-origin',
      };

      const res = await fetch(url, init);
      const meta = extractMeta(res.headers);
      onResponseMeta?.(meta);

      const contentType = res.headers.get('Content-Type') || '';
      const isJson = contentType.includes('application/json');
      const isXml = contentType.includes('application/xml') || contentType.includes('text/xml');
      
      let data;
      if (isJson) {
        data = await res.json().catch(() => null);
      } else if (isXml) {
        const xmlText = await res.text().catch(() => '');
        data = { __xml: true, raw: xmlText };
      } else {
        data = await res.text().catch(() => '');
      }

      if (!res.ok) {
        const err = new Error((data && data.error && data.error.message) || `HTTP ${res.status}`);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      return data;
    },

    get(path, options = {}) {
      return client.request('GET', path, options);
    },

    put(path, body) {
      return client.request('PUT', path, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
    },

    patch(path, body) {
      return client.request('PATCH', path, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
    },

    delete(path) {
      return client.request('DELETE', path);
    },

    post(path, body, contentType = 'application/json') {
      const headers = {};
      let payload = undefined;

      if (contentType === 'application/json') {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body ?? {});
      } else if (contentType === 'application/x-www-form-urlencoded') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(body ?? {})) {
          if (v === undefined || v === null) continue;
          params.set(k, String(v));
        }
        payload = params.toString();
      }

      return client.request('POST', path, { headers, body: payload });
    },

    // New method for file uploads (multipart/form-data)
    async upload(path, formData) {
      const effectiveAuth = typeof getAuth === 'function' ? getAuth() : auth;
      const url = applyQueryAuth(`${safeBase}${path}`, effectiveAuth);

      const headers = {
        ...buildAuthHeaders(effectiveAuth),
        // Don't set Content-Type - browser will set it with boundary for multipart
      };

      const init = {
        method: 'POST',
        headers,
        body: formData,
        credentials: effectiveAuth?.type === 'cookie' ? 'include' : 'same-origin',
      };

      const res = await fetch(url, init);
      const meta = extractMeta(res.headers);
      onResponseMeta?.(meta);

      const contentType = res.headers.get('Content-Type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '');

      if (!res.ok) {
        const err = new Error((data && data.error && data.error.message) || `HTTP ${res.status}`);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      return data;
    },
  };

  return client;
}
